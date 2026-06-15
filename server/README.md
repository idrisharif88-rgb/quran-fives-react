# خادم مزامنة حالة تطبيق المصحف

خدمة Express صغيرة تخزّن حالة التطبيق الواحدة (استخدام شخصي) محمية برمز مزامنة.

## التشغيل محلياً

```bash
cd server
npm install
SYNC_CODE="رمز-سري-طويل-عشوائي" npm start
```

(على ويندوز PowerShell: `$env:SYNC_CODE="..."; npm start`)

## النقاط (Endpoints)

كلها تتطلب ترويسة `X-Sync-Code` مطابقة لـ `SYNC_CODE`.

- `GET  /api/health` — فحص الحياة
- `GET  /api/state`  — يعيد `{ updatedAt, state }`
- `PUT  /api/state`  — يستقبل `{ updatedAt, state }` ويخزّنه (آخر تعديل يفوز)

## النشر على VPS

1. انسخ مجلد `server/` إلى الخادم.
2. `npm install --omit=dev`
3. شغّله دائماً عبر `pm2`:
   ```bash
   npm i -g pm2
   SYNC_CODE="..." pm2 start index.js --name quran-sync
   pm2 save && pm2 startup
   ```
4. **HTTPS إلزامي:** تطبيق أندرويد يعمل من أصل https، فلا يستطيع نداء http (Mixed Content).
   ضع nginx كوكيل عكسي مع شهادة Let's Encrypt:
   ```nginx
   location /api/ {
       proxy_pass http://127.0.0.1:3001;
   }
   ```
5. ضع رابط الـ HTTPS ورمز المزامنة في ملف `.env` بجذر مشروع React (انظر `.env.example`).

## متغيّرات البيئة

- `SYNC_CODE` (إلزامي) — الرمز السري المشترك.
- `PORT` (اختياري، الافتراضي 3001)
- `DATA_DIR` (اختياري) — مكان حفظ `state.json`.
