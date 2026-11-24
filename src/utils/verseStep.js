import { SURAH_METADATA } from '../data/quranConstants';

/**
 * الآية التالية (step = 1) أو السابقة (step = -1) لـ { s, a }، تعبر حدود السور وتلتفّ من الناس إلى الفاتحة.
 */
export function stepVerse({ s, a }, step) {
  if (step > 0) {
    if (a < SURAH_METADATA[s - 1].verseCount) return { s, a: a + 1 };
    return { s: s === 114 ? 1 : s + 1, a: 1 };
  }
  if (a > 1) return { s, a: a - 1 };
  const prev = s === 1 ? 114 : s - 1;
  return { s: prev, a: SURAH_METADATA[prev - 1].verseCount };
}
