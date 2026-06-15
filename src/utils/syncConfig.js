// إعدادات مزامنة السحابة. تُضبط عبر ملف .env بجذر المشروع:
//   VITE_SYNC_URL=https://your-domain.com
//   VITE_SYNC_CODE=رمز-سري-طويل-عشوائي
// إن لم تُضبط، تبقى المزامنة معطّلة والتطبيق يعمل بـ localStorage فقط.
export const SYNC_URL = (import.meta.env.VITE_SYNC_URL || '').replace(/\/$/, '');
export const SYNC_CODE = import.meta.env.VITE_SYNC_CODE || '';
export const SYNC_ENABLED = Boolean(SYNC_URL && SYNC_CODE);
