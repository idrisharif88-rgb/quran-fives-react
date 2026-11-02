import { Capacitor } from '@capacitor/core';

// ─── الموقع: العمل بلا إنترنت ───
// عامل الخدمة يولّده vite-plugin-pwa عند البناء. النسخة الجديدة تعمل عند الفتح التالي بعد إغلاق كل
// الألسنة، فلا تُستبدل الملفات تحت صفحة مفتوحة. طلب الحفظ الدائم يقلّل مسح المتصفح لبيانات الزائر.
export function startWebShell() {
  if (Capacitor.isNativePlatform() || !import.meta.env.PROD) return;
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
  navigator.storage?.persist?.().catch(() => {});
}
