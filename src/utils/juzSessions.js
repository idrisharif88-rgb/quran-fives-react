import { juzOfPage, juzPageRange, juzPageCount, lapsOfJuz } from '../data/juzPages';

// جولات الصفحات → قائمة جديدة: إعادة قراءة صفحة تستبدل جولتها القديمة
export function upsertLap(laps, page, ms) {
  const idx = laps.findIndex((l) => l.page === page);
  if (idx === -1) return [...laps, { page, ms }];
  const next = laps.slice();
  next[idx] = { page, ms };
  return next;
}

// الجزء الذي يُغلقه إنهاء هذه الصفحة: رقمه إن كانت آخر صفحاته، وإلا null.
// إنهاء آخر صفحة = بدء أول صفحة من الجزء التالي، وهي لحظة ظهور بطاقة النتيجة.
export function closingJuz(finishedPage) {
  if (!Number.isFinite(finishedPage) || finishedPage < 1) return null;
  const juz = juzOfPage(finishedPage);
  return juzPageRange(juz).end === finishedPage ? juz : null;
}

// ملخّص جزء واحد من الجولات: صفحاته وحده، ولو كانت أقل من صفحات الجزء كاملاً.
// complete = كل صفحات الجزء موقّتة (شرط تسجيل الرقم القياسي الشخصي).
export function summarizeJuz(laps, juz) {
  const juzLaps = lapsOfJuz(laps, juz);
  if (juzLaps.length === 0) return null;
  const ms = juzLaps.reduce((sum, l) => sum + l.ms, 0);
  return {
    juz,
    ms,
    avgPerPage: ms / juzLaps.length,
    laps: juzLaps,
    complete: juzLaps.length >= juzPageCount(juz),
  };
}
