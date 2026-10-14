import { LAST_PAGE } from './juzPages';

// بطاقات العدّاد كل عشر صفحات: تنتهي عند 11، 21، 31 … 591، والأخيرة 592–604 (13 صفحة).
// الأولى 1–11. الكتلة تُعرَّف بآخر صفحاتها.
const FIRST_END = 11;
const LAST_START = 592;

// آخر صفحة في الكتلة التي تقع فيها الصفحة
export function blockEndOf(page) {
  if (page >= LAST_START) return LAST_PAGE;
  if (page <= FIRST_END) return FIRST_END;
  return Math.ceil((page - 1) / 10) * 10 + 1;
}

// أول صفحة في الكتلة التي آخرها end
export function blockStartOf(end) {
  if (end === LAST_PAGE) return LAST_START;
  if (end === FIRST_END) return 1;
  return end - 9;
}

// الكتلة التي يُغلقها إنهاء هذه الصفحة (آخر صفحة فيها)، وإلا null.
// إنهاء آخر صفحة = بدء التالية، وهي لحظة ظهور البطاقة (تنتهي عند 11 فتظهر مع بدء 12).
export function closingBlock(finishedPage) {
  if (!Number.isFinite(finishedPage) || finishedPage < 1) return null;
  return blockEndOf(finishedPage) === finishedPage ? finishedPage : null;
}

// جولات كتلة واحدة من قائمة الجولات [{ page, ms }]
export function lapsOfBlock(laps, end) {
  return laps.filter((l) => Number.isFinite(l.page) && l.page >= 1 && blockEndOf(l.page) === end);
}
