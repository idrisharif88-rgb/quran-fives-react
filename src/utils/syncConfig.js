// إعدادات مزامنة السحابة. تُضبط عبر ملف .env بجذر المشروع:
//   VITE_SYNC_URL=https://your-domain.com
// لا رمز مشترك في التطبيق: كل مستخدم يدخل بحسابه (انظر syncAccount.js).
// إن لم يُضبط الرابط، تبقى المزامنة معطّلة والتطبيق يعمل بـ localStorage فقط.
export const SYNC_URL = (import.meta.env.VITE_SYNC_URL || '').replace(/\/$/, '');
export const SYNC_ENABLED = Boolean(SYNC_URL);
