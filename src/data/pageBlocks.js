import { juzOfPage, juzPageRange } from './juzPages';

// بطاقات العدّاد كل جزء (قرابة عشرين صفحة): تنتهي عند 21، 41، 61 … 581، والأخيرة 582–604.
// الأجزاء ليست 20 صفحة بالضبط (juzPages.js). الكتلة تُعرَّف بآخر صفحاتها.

// آخر صفحة في الكتلة التي تقع فيها الصفحة
export function blockEndOf(page) {
  return juzPageRange(juzOfPage(page)).end;
}

// أول صفحة في الكتلة التي آخرها end
export function blockStartOf(end) {
  return juzPageRange(juzOfPage(end)).start;
}

// الكتلة التي يُغلقها إنهاء هذه الصفحة (آخر صفحة فيها)، وإلا null.
// إنهاء آخر صفحة = بدء التالية، وهي لحظة ظهور البطاقة (تنتهي عند 21 فتظهر مع بدء 22).
export function closingBlock(finishedPage) {
  if (!Number.isFinite(finishedPage) || finishedPage < 1) return null;
  return blockEndOf(finishedPage) === finishedPage ? finishedPage : null;
}

// جولات كتلة واحدة من قائمة الجولات [{ page, ms }]
export function lapsOfBlock(laps, end) {
  return laps.filter((l) => Number.isFinite(l.page) && l.page >= 1 && blockEndOf(l.page) === end);
}
