# Quran Fives — Sync Server Deployment Guide

A self-contained, step-by-step guide to run the state-sync server. The server is a
Node.js/Express service that stores a single app state (personal use) in a JSON file,
protected by a secret sync code.

## Requirements
- A Linux VPS (e.g. Ubuntu/Debian) with root or sudo access.
- A domain name pointing to the VPS IP — required for the HTTPS certificate.
- Node.js 18+ and npm installed (`node -v` to verify).

## Secret sync code
Use this code (or generate your own with `openssl rand -base64 24`):
```
2dDQNYhGkXAVanrKCYsvL42CooQxg8bH
```
It must be **identical** on the server (`SYNC_CODE`) and in the React project's `.env`
(`VITE_SYNC_CODE`).

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
SYNC_CODE="2dDQNYhGkXAVanrKCYsvL42CooQxg8bH" pm2 start index.js --name quran-sync
pm2 save
pm2 startup        # run the command it prints so it auto-starts on reboot
```
Verify it's running:
```bash
curl -s -H "X-Sync-Code: 2dDQNYhGkXAVanrKCYsvL42CooQxg8bH" http://localhost:3001/api/health
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
curl -s -H "X-Sync-Code: 2dDQNYhGkXAVanrKCYsvL42CooQxg8bH" https://YOUR_DOMAIN.com/api/health
# expected: {"ok":true}

# without the code it must return 401:
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR_DOMAIN.com/api/health
```

## 6) Connect the app (on your dev machine, not the server)
In the React project root, create a `.env` file:
```
VITE_SYNC_URL=https://YOUR_DOMAIN.com
VITE_SYNC_CODE=2dDQNYhGkXAVanrKCYsvL42CooQxg8bH
```
Then rebuild and sync:
```bash
npm run build
npx cap sync android
```
And build the APK from Android Studio.

## Endpoints (reference)
All require the `X-Sync-Code` header.
- `GET  /api/health` → `{ ok: true }`
- `GET  /api/state`  → `{ updatedAt, state }`
- `PUT  /api/state`  ← `{ updatedAt, state }` (last-write-wins; ignores older)

## Notes
- Data is stored in `data/state.json` inside the server folder. Back it up periodically.
- To change the code later: stop pm2, restart with a new `SYNC_CODE`, update `.env`, and rebuild the app.
- Optional env vars: `PORT` (default 3001), `DATA_DIR` (where state is stored).
