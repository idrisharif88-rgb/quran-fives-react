import { describe, it, expect } from 'vitest';
import { khatmaDoneMessage } from './khatmaMessage';

describe('khatmaDoneMessage', () => {
  it('numbers the khatma after the recorded ones', () => {
    expect(khatmaDoneMessage(19, 604)).toBe('هذه ختمتك رقم 20. تقبّل الله منك وجعلها حجّة لك.');
    expect(khatmaDoneMessage(0, 604)).toContain('رقم 1.');
  });
  it('falls back when the count is unknown (ختماتي locked)', () => {
    expect(khatmaDoneMessage(null, 604)).toBe('أتممت قراءة القرآن الكريم كاملاً، 604 صفحات. تقبّل الله منك.');
  });
});
