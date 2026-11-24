import { describe, it, expect } from 'vitest';
import { stepVerse } from './verseStep';

describe('stepVerse', () => {
  it('moves inside a surah', () => {
    expect(stepVerse({ s: 2, a: 5 }, 1)).toEqual({ s: 2, a: 6 });
    expect(stepVerse({ s: 2, a: 5 }, -1)).toEqual({ s: 2, a: 4 });
  });
  it('crosses surahs both ways', () => {
    expect(stepVerse({ s: 1, a: 7 }, 1)).toEqual({ s: 2, a: 1 });
    expect(stepVerse({ s: 2, a: 1 }, -1)).toEqual({ s: 1, a: 7 });
  });
  it('wraps around the mushaf', () => {
    expect(stepVerse({ s: 114, a: 6 }, 1)).toEqual({ s: 1, a: 1 });
    expect(stepVerse({ s: 1, a: 1 }, -1)).toEqual({ s: 114, a: 6 });
  });
});
