import { PAGE_STARTS } from './pageStarts';
import { SURAH_METADATA } from './quranConstants';

function getPageForVerse(surah, ayah) {
  for (let i = PAGE_STARTS.length - 1; i >= 0; i--) {
    const ps = PAGE_STARTS[i];
    if (ps.s < surah || (ps.s === surah && ps.a <= ayah)) {
      return ps.page;
    }
  }
  return 1;
}

// عدد صفحات كل سورة: من صفحة الآية الأولى إلى صفحة الآية الأخيرة
export const SURAH_PAGE_COUNTS = SURAH_METADATA.map(s => {
  const firstPage = getPageForVerse(s.id, 1);
  const lastPage  = getPageForVerse(s.id, s.verseCount);
  return lastPage - firstPage + 1;
});
