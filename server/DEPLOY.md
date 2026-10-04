# Quran Fives — Sync Server Deployment Guide

A self-contained, step-by-step guide to run the state-sync server. The server is a
Node.js/Express service with one account per user (email + password). Each account has
its own app state and khatma record, stored as JSON files. Sign-up is open until
`MAX_USERS` accounts exist; the email is confirmed with a 6-digit code sent through
[Resend](https://resend.com), and a forgotten password is reset the same way.

## Requirements
- A Linux VPS (e.g. Ubuntu/Debian) with root or sudo access.
- A domain name pointing to the VPS IP — required for the HTTPS certificate.
- Node.js 18+ and npm installed (`node -v` to verify).

## 1) Upload the server files
Copy the whole `server/` folder to the VPS (via scp or git). Example:
```bash
scp -r server/ user@YOUR_SERVER_IP:/opt/quran-sync
```
Then on the server:
```bash
cd /opt/quran-sync
npm install --omit=dev
```

## 2) Run it persistently with pm2
```bash
sudo npm i -g pm2
RESEND_API_KEY="re_..." MAIL_FROM="خماسيات <no-reply@YOUR_DOMAIN.com>" MAX_USERS=100 \
  pm2 start index.js --name quran-sync
pm2 save
pm2 startup        # run the command it prints so it auto-starts on reboot
```
Verify it's running:
```bash
curl -s http://localhost:3001/api/health
# expected: {"ok":true}
```

## 3) HTTPS via nginx + Let's Encrypt (required)
The Android app runs from an https origin, so it cannot call http (mixed content).

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/quran-sync`:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Enable it and obtain the certificate:
```bash
sudo ln -s /etc/nginx/sites-available/quran-sync /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d YOUR_DOMAIN.com
```
certbot upgrades port 80 to 443 automatically.

## 4) Firewall (if enabled)
```bash
sudo ufw allow 'Nginx Full'
```
Do NOT expose port 3001 publicly — only nginx reaches it locally.

## 5) Test from outside
```bash
curl -s https://YOUR_DOMAIN.com/api/health
# expected: {"ok":true}

# data endpoints without an account must return 401:
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR_DOMAIN.com/api/state
```

## 6) Connect the app (on your dev machine, not the server)
In the React project root, create a `.env` file:
```
VITE_SYNC_URL=https://YOUR_DOMAIN.com
```
Then rebuild and sync:
```bash
npm run build
npx cap sync android
```
And build the APK from Android Studio.

## Endpoints (reference)
Auth is `Authorization: Basic base64(user:code)` (UTF-8). Old app versions send
`X-Khitma-User` / `X-Khitma-Code`, which are still accepted.
- `GET  /api/health` → `{ ok: true }` (no auth)
- `POST /api/auth/register` ← `{ user, code }` (`user` must be an email) → 202 and a
  code is emailed, or 400 / 409 (already registered) / 403 (`MAX_USERS` reached) / 429 /
  503 (mail failed). No account exists yet and nothing counts toward the cap.
- `POST /api/auth/verify` ← `{ user, otp }` → 201, the account is created; or 400
- `POST /api/auth/reset/request` ← `{ user }` → always 200 (never reveals whether the
  email is registered)
- `POST /api/auth/reset/confirm` ← `{ user, otp, code }` → 200, or 400
- `POST /api/auth/login` → 202 and a login code is emailed (new device), 200 for a
  trusted device, or 401 / 429
- `POST /api/auth/login/confirm` ← `{ otp }` → 200 with `{ device }`

Two-step sign-in: every email account needs, besides its password, an `X-Device` header
holding a trusted-device key. The server hands one out whenever an emailed code is
confirmed (sign-up, login, or reset); up to 10 per account, and a password reset revokes
them all. The owner's migrated account is a username with no email, so it stays
password-only.
- `GET  /api/auth/me` → `{ name, approved, admin }`
- `GET  /api/admin/users`, `POST /api/admin/users/approval` ← `{ user, approved }` —
  owner only

Owner approval: a new account can sign in, but every data endpoint answers 403 until the
owner approves it from inside the app (sync panel → «إدارة المستخدمين»). The owner is
`OWNER_EMAIL`, or `KHITMA_USER` when no email was set. Revoking approval stops that
account's sync; its data stays.

- `GET  /api/state`  → `{ updatedAt, state }`
- `PUT  /api/state`  ← `{ state, baseUpdatedAt, writeId }` → `{ ok: true, updatedAt }`
  - `updatedAt` is assigned by the **server clock**. Device clocks are never trusted:
    a device with a skewed clock used to win "last-write-wins" and overwrite newer data.
  - `baseUpdatedAt` is the `updatedAt` the device last saw. If it no longer matches the
    stored one, another device wrote in the meantime → **409 Conflict**, nothing is written.
    The device must `GET` the newer state first, then push again.
  - `writeId` makes a retried write idempotent (same id → same success, not a 409).
- `GET  /api/khitma` / `PUT /api/khitma` — same contract with `list` instead of `state`.

Emailed codes are 6 digits, valid 15 minutes, and die after 5 wrong attempts.

Rate limits (in memory, per server process): 10 emails per IP per hour and 3 per address
per 15 minutes; 20 failed logins per IP and 30 per account per 15 minutes. Past a limit
requests get 429.

## Upgrading an existing server
Deploy the server **first**, then rebuild the app — they share a request contract.

The server is now several files, so copy all of them, not only `index.js`:
```bash
scp server/*.js server/package.json root@YOUR_SERVER_IP:/opt/quran-sync/
pm2 restart quran-sync
pm2 logs quran-sync --lines 5
```
No new npm dependencies were added.

Set the mail variables once (the `MAIL_FROM` domain must be verified in Resend):
```bash
RESEND_API_KEY="re_..." MAIL_FROM="خماسيات <no-reply@YOUR_DOMAIN.com>" \
  OWNER_EMAIL="you@example.com" OWNER_NAME="اسمك" \
  pm2 restart quran-sync --update-env && pm2 save
```
Without them the server still starts but **prints codes to the log instead of emailing
them** — nobody can sign up. The startup log warns when they are missing.

**Upgrading from the single-user server (shared `SYNC_CODE`):** on its first start the
new server creates the owner's account and copies `data/state.json` and
`data/khitma.json` into it, timestamps included. The log prints «نُقلت بيانات المالك إلى
حسابه» once. The original two files are left in place as a backup. `SYNC_CODE` is no
longer read.

Set `OWNER_EMAIL` (and optionally `OWNER_NAME`) **before that first start**, in the same
command as the mail variables. The owner's account is then an email account like any
other: sign in with that email and the old `KHITMA_CODE` as the password, confirm the
mailed code, and reset the password by mail if needed. On each of the owner's devices
the first sign-in shows the «نسختان مختلفتان» choice once.

Without `OWNER_EMAIL` the account keeps the old `KHITMA_USER` name: password only, no
two-step sign-in, no mail recovery. The migration runs once, so this cannot be changed
afterwards except by hand.

App versions built before accounts send only the shared code for `/api/state`, so their
state sync gets 401 until they are updated. Their khatma record keeps working.

⚠️ Before copying files to the server, diff `index.js` against what is actually running —
the deployed file may contain endpoints that were never committed here.

## Notes
- Data lives in `data/users/<key>/` inside the server folder: `account.json` (salted
  scrypt hash, never the code itself), `state.json`, `khitma.json`. `<key>` is a hash of
  the username. Back the whole `data/` folder up periodically.
- To raise the user cap: `MAX_USERS=500 pm2 restart quran-sync --update-env`. No app release needed.
- Pending sign-ups and reset codes live in `data/pending/` and are safe to delete.
- Manual password reset (e.g. the owner's non-email account): delete that user's
  `account.json`; the data files beside it stay.
- Optional env vars: `PORT` (default 3001), `DATA_DIR` (where data is stored).
