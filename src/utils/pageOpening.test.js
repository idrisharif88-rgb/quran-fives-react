import { describe, it, expect } from 'vitest';
import { pageOpening as raw, pageOpeningVerse } from './pageOpening';

// ترتيب الحركات فوق الحرف يختلف بين المصادر (شدّة ثم فتحة أو العكس)
const pageOpening = (page) => raw(page).normalize('NFC');
const nfc = (t) => t.normalize('NFC');

describe('pageOpening', () => {
  it('gives the first three words of a page, without the basmala or pause marks', () => {
    expect(pageOpening(2)).toBe(nfc('الم ذَٰلِكَ الْكِتَابُ'));          // «الم» قصيرة: تكمل من التالية
    expect(pageOpening(604).split(' ')).toHaveLength(3);
    expect(pageOpening(604).startsWith('قُلْ هُوَ ')).toBe(true);
    expect(pageOpening(187)).toBe(nfc('بَرَاءَةٌ مِنَ اللَّهِ'));
    expect(pageOpening(1)).toBe(nfc('بِسْمِ اللَّهِ الرَّحْمَٰنِ'));     // الفاتحة: البسملة آيتها الأولى
  });

  it('is empty outside the mushaf', () => {
    expect(pageOpening(0)).toBe('');
    expect(pageOpening(605)).toBe('');
  });

  it('gives the number of the verse a page opens with', () => {
    expect(pageOpeningVerse(3)).toBe(6);
    expect(pageOpeningVerse(50)).toBe(1);
    expect(pageOpeningVerse(605)).toBe(null);
  });
});
