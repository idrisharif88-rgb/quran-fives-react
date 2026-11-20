import { loadStoredState, saveStoredState } from './persistence';

// ─── التنقّل بين الصفحات بالضغط المطوّل وأزرار الصوت ───
// إعداد جهاز (لا يُزامَن): كلاهما مفعّل افتراضياً، ويطفئه المستخدم من «إعدادات الصوت».
export const PAGE_NAV_KEY = 'quran-fives-page-nav-v1';
export const PAGE_NAV_EVENT = 'quran-fives-page-nav-change';
export const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 12;

const DEFAULTS = { longPress: true, volume: true };

export function loadPageNav() {
  const raw = loadStoredState(PAGE_NAV_KEY);
  return {
    longPress: typeof raw?.longPress === 'boolean' ? raw.longPress : DEFAULTS.longPress,
    volume: typeof raw?.volume === 'boolean' ? raw.volume : DEFAULTS.volume,
  };
}

export function savePageNav(next) {
  saveStoredState(PAGE_NAV_KEY, next);
  window.dispatchEvent(new Event(PAGE_NAV_EVENT));
}

/** النصف الأيسر يتقدّم (الصفحة التالية في المصحف إلى اليسار)، والأيمن يرجع */
export const directionAt = (x, width) => (x < width / 2 ? 'next' : 'prev');

export const movedTooFar = (a, b) => Math.hypot(b.x - a.x, b.y - a.y) > MOVE_TOLERANCE_PX;

// الضغط المطوّل على زرّ أو حقل يبقى له، لا للتنقّل
const OWN_PRESS = 'button, a, input, select, textarea, [role="button"], [contenteditable="true"]';
// مساحات التنقّل: شاشة البطاقات والعدّاد، وصفحة المصحف
const NAV_AREA = '.content-layout, .mushaf-pager';

export function isNavTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(NAV_AREA)) && !target.closest(OWN_PRESS);
}
