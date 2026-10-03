// صفحة بداية كل جزء في مصحف المدينة (604 صفحات).
// الأجزاء ليست 20 صفحة بالضبط: الجزء الأول 21 صفحة (1–21) والأخير 23 (582–604).
export const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
  201, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

export const LAST_PAGE = 604;

// رقم الجزء (1–30) الذي تقع فيه الصفحة
export function juzOfPage(page) {
  let juz = 1;
  for (let i = 0; i < JUZ_START_PAGES.length; i++) {
    if (page >= JUZ_START_PAGES[i]) juz = i + 1;
    else break;
  }
  return juz;
}

// أول وآخر صفحة في الجزء
export function juzPageRange(juz) {
  const start = JUZ_START_PAGES[juz - 1];
  const end = juz < JUZ_START_PAGES.length ? JUZ_START_PAGES[juz] - 1 : LAST_PAGE;
  return { start, end };
}

export function juzPageCount(juz) {
  const { start, end } = juzPageRange(juz);
  return end - start + 1;
}

// جولات جزء واحد فقط من قائمة الجولات [{ page, ms }]
export function lapsOfJuz(laps, juz) {
  return laps.filter((l) => Number.isFinite(l.page) && l.page >= 1 && juzOfPage(l.page) === juz);
}
