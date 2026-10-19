import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

// لون خلفية الصفحة وأيقونات أشرطة النظام (الوقت/البطارية) في أندرويد.
// إضافة SystemBars في Capacitor 8 تلوّن الأيقونات حسب وضع الهاتف لا وضع التطبيق، وتعيد ذلك عند
// كل تغيّر في إعدادات الهاتف — فتصير الأيقونات فاتحة فوق خلفية النهار وتختفي. نخبرها بنمط التطبيق
// كي تحفظه وتعيده هي نفسها، ثم يلوّن MainActivity خلفية النافذة (setStyle يعيدها إلى لون الثيم).
export async function applySystemBars(pageBg, isNightMode) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = pageBg;

  if (Capacitor.getPlatform() === 'android') {
    await SystemBars.setStyle({ style: isNightMode ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
  }
  window.AndroidApp?.setWindowBackground?.(pageBg);
}
