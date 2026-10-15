import { PAGE_STARTS } from '../data/pageStarts';
import { QURAN_VERSES } from '../data/quranVerses';

// أوّل كلمات صفحة المصحف — تذكير بمطلعها فوق دائرة العدّاد.
// من QURAN_VERSES (بلا بسملة في أوائل السور، وبرسم إملائي يقرؤه خطّ Tajawal)، وتكمل
// من الآيات التالية إن قصرت الأولى («الم» وحدها في أول البقرة).
const PAUSE_MARK = /^[ۖ-ۭ]+$/;   // علامات الوقف تُكتب منفصلة («ۛ»، «ۗ»)

const startOfPage = new Map(PAGE_STARTS.map((p) => [p.page, p]));
const indexOfVerse = new Map(QURAN_VERSES.map((v, i) => [`${v.s}:${v.a}`, i]));

export function pageOpening(page, count = 3) {
  const start = startOfPage.get(page);
  if (!start) return '';
  const words = [];
  for (let i = indexOfVerse.get(`${start.s}:${start.a}`); words.length < count && i < QURAN_VERSES.length; i++) {
    for (const word of QURAN_VERSES[i].t.split(/\s+/)) {
      if (word && !PAUSE_MARK.test(word)) words.push(word);
      if (words.length === count) break;
    }
  }
  return words.join(' ');
}
