import { describe, it, expect } from 'vitest';
import { pageOfVerse } from './versePage';

describe('pageOfVerse', () => {
  it('finds the mushaf page of a verse', () => {
    expect(pageOfVerse(1, 1)).toBe(1);
    expect(pageOfVerse(1, 7)).toBe(1);
    expect(pageOfVerse(2, 1)).toBe(2);
    expect(pageOfVerse(2, 6)).toBe(3);
    expect(pageOfVerse(2, 255)).toBe(42);
    expect(pageOfVerse(114, 6)).toBe(604);
  });
});
