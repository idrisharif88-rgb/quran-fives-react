import { PAGE_STARTS } from '../data/pageStarts';
import { SURAH_METADATA } from '../data/quranConstants';

// آيات الصفحة التي رقمها من مضاعفات الخمسة (5، 10، 15…) — علامات حول دائرة العدّاد.
// الصفحة من أوّل آية فيها إلى ما قبل أوّل آية في الصفحة التالية.
export function fivesOnPage(page) {
  const start = PAGE_STARTS[page - 1];
  if (!start || start.page !== page) return [];
  const next = PAGE_STARTS[page];
  const marks = [];
  let s = start.s;
  let a = start.a;
  while (s <= 114) {
    if (next && (s > next.s || (s === next.s && a >= next.a))) break;
    if (a % 5 === 0) marks.push({ surah: s, ayah: a });
    if (a < SURAH_METADATA[s - 1].verseCount) a += 1;
    else { s += 1; a = 1; }
  }
  return marks;
}
