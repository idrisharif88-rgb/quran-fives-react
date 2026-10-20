import { loadStoredState, saveStoredState } from './persistence';

// ─── حجم العرض: تكبير التطبيق كلّه أو تصغيره (مثل Ctrl +/−) ───
// إعداد جهاز لا يُزامَن. 100 هو حجم الهاتف نفسه: WebView يتبع أصلاً حجم الخط في إعدادات أندرويد.
// التكبير بـ CSS zoom على <html>؛ وحدات vh/vw تتضخّم معه فتتجاوز الشاشة، لذا تمرّ في الأنماط
// عبر --vh و--vw و--dvh (styles/appScale.css) وتُصحَّح هنا بقسمتها على المعامل.
// المصحف وآيات الورد يُعفيان من التكبير (.app-unzoom): يُرسمان بقياس أطرهما، والتكبير فوقه
// كان يضاعف الحجم فتخرج الصفحة عن إطارها.
export const SCALE_KEY = 'quran-fives-app-scale-v1';
export const ALL_SCALE_STEPS = [80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155];
export const DEFAULT_SCALE = 100;
// السقوف مقيسة على الأجهزة (أقصر ضلع بوحدات CSS): Note 9 (411) سليم حتى 110،
// Tab S6 وTab Active 3 (800) حتى 155 — Active 3 احتمل 160 وS6 لا، فالأدنى للفئة كلّها.
// بين النقطتين خطّ مستقيم، وفوق 800 يبقى 155، وتحت 410 يتناسب مع العرض.
const PHONE = { side: 410, max: 110 };
const TABLET = { side: 800, max: 155 };

const toStep = (value) => Math.floor(value / 5) * 5;

// أكبر تكبير يسمح به عرض الجهاز (أقصر ضلعيه، فلا يتغيّر بالتدوير)
export function maxScaleFor(shortSide) {
  let fit;
  if (shortSide >= TABLET.side) fit = TABLET.max;
  else if (shortSide >= PHONE.side) {
    const t = (shortSide - PHONE.side) / (TABLET.side - PHONE.side);
    fit = PHONE.max + t * (TABLET.max - PHONE.max);
  } else fit = (shortSide / PHONE.side) * PHONE.max;
  return Math.max(DEFAULT_SCALE, toStep(fit));
}

const deviceShortSide = () => Math.min(window.screen?.width || window.innerWidth, window.screen?.height || window.innerHeight);

export const scaleSteps = (shortSide = deviceShortSide()) => {
  const max = maxScaleFor(shortSide);
  return ALL_SCALE_STEPS.filter((s) => s <= max);
};

export function loadScale() {
  const value = Number(loadStoredState(SCALE_KEY));
  if (!ALL_SCALE_STEPS.includes(value)) return DEFAULT_SCALE;
  return Math.min(value, maxScaleFor(deviceShortSide()));
}

export const saveScale = (scale) => saveStoredState(SCALE_KEY, scale);

export function applyScale(scale) {
  const root = document.documentElement;
  if (scale === DEFAULT_SCALE) {
    root.style.zoom = '';
    ['--vh', '--vw', '--dvh', '--unzoom'].forEach((name) => root.style.removeProperty(name));
    return;
  }
  const factor = scale / 100;
  root.style.zoom = String(factor);
  root.style.setProperty('--unzoom', String(1 / factor));
  const vh = `${window.innerHeight / factor / 100}px`;
  root.style.setProperty('--vh', vh);
  root.style.setProperty('--dvh', vh);
  root.style.setProperty('--vw', `${window.innerWidth / factor / 100}px`);
}
