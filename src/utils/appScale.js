import { loadStoredState, saveStoredState } from './persistence';

// ─── حجم العرض: تكبير التطبيق كلّه أو تصغيره (مثل Ctrl +/−) ───
// إعداد جهاز لا يُزامَن. 100 هو حجم الهاتف نفسه: WebView يتبع أصلاً حجم الخط في إعدادات أندرويد.
// التكبير بـ CSS zoom على <html>؛ وحدات vh/vw تتضخّم معه فتتجاوز الشاشة، لذا تمرّ في الأنماط
// عبر --vh و--vw و--dvh (styles/appScale.css) وتُصحَّح هنا بقسمتها على المعامل.
export const SCALE_KEY = 'quran-fives-app-scale-v1';
// السقف 115: عند 120 يُقصّ نصّ بطاقة الآية وأزرار العدّاد السفلى على هاتف بعرض 380
export const SCALE_STEPS = [80, 85, 90, 95, 100, 105, 110, 115];
export const DEFAULT_SCALE = 100;

export function loadScale() {
  const value = Number(loadStoredState(SCALE_KEY));
  return SCALE_STEPS.includes(value) ? value : DEFAULT_SCALE;
}

export const saveScale = (scale) => saveStoredState(SCALE_KEY, scale);

export function applyScale(scale) {
  const root = document.documentElement;
  if (scale === DEFAULT_SCALE) {
    root.style.zoom = '';
    ['--vh', '--vw', '--dvh'].forEach((name) => root.style.removeProperty(name));
    return;
  }
  const factor = scale / 100;
  root.style.zoom = String(factor);
  const vh = `${window.innerHeight / factor / 100}px`;
  root.style.setProperty('--vh', vh);
  root.style.setProperty('--dvh', vh);
  root.style.setProperty('--vw', `${window.innerWidth / factor / 100}px`);
}
