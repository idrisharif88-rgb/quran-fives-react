import { describe, it, expect } from 'vitest';
import { normalizeArabic, highlightParts, placeLabel } from './libraryText';

describe('libraryText', () => {
  it('normalizes like the server', () => {
    expect(normalizeArabic('الصَّلاةُ إلى')).toBe('الصلاه الي');
  });
  it('highlights words that contain a search term, ignoring tashkeel', () => {
    const hits = highlightParts('فليبدأ بالصلاة على محمد', 'الصَّلاة').filter((p) => p.hit).map((p) => p.text);
    expect(hits).toEqual(['بالصلاة']);
  });
  it('does not light up longer words that only contain the term', () => {
    const hits = highlightParts('عليه السلام على محمد وآله', 'على محمد وآل').filter((p) => p.hit).map((p) => p.text);
    expect(hits).toEqual(['على', 'محمد', 'وآله']);
  });
  it('keeps the text intact', () => {
    const t = 'قال: من كانت له  حاجة';
    expect(highlightParts(t, 'حاجه').map((p) => p.text).join('')).toBe(t);
  });
  it('drops volume 0', () => {
    expect(placeLabel({ vol: 2, page: 493 })).toBe('ج ٢، ص ٤٩٣');
    expect(placeLabel({ vol: 0, page: 594 })).toBe('ص ٥٩٤');
  });
});
