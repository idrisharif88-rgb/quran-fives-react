import { Capacitor } from '@capacitor/core';
import { registerSW } from 'virtual:pwa-register';
import { startWebUpdates } from './webUpdate';

// ─── الموقع: العمل بلا إنترنت ───
// عامل الخدمة يولّده vite-plugin-pwa عند البناء. النسخة الجديدة لا تُستبدل تحت صفحة مفتوحة: يظهر
// «نسخة جديدة — حدّث الآن» (webUpdate.js) والزائر يختار. طلب الحفظ الدائم يقلّل مسح المتصفح لبيانات الزائر.
export function startWebShell() {
  if (Capacitor.isNativePlatform() || !import.meta.env.PROD) return;
  if ('serviceWorker' in navigator) startWebUpdates(registerSW);
  navigator.storage?.persist?.().catch(() => {});
}
