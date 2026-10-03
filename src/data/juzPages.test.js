import { describe, it, expect } from 'vitest';
import { juzOfPage, juzPageRange, juzPageCount, lapsOfJuz, LAST_PAGE } from './juzPages';

describe('juzPages', () => {
  it('puts page 21 in juz 1 and page 22 in juz 2', () => {
    expect(juzOfPage(1)).toBe(1);
    expect(juzOfPage(21)).toBe(1);
    expect(juzOfPage(22)).toBe(2);
    expect(juzOfPage(41)).toBe(2);
    expect(juzOfPage(42)).toBe(3);
  });

  it('handles the irregular juz 7, 11 and 30', () => {
    expect(juzPageRange(6)).toEqual({ start: 102, end: 120 });
    expect(juzPageRange(7)).toEqual({ start: 121, end: 141 });
    expect(juzPageRange(11)).toEqual({ start: 201, end: 221 });
    expect(juzPageRange(30)).toEqual({ start: 582, end: LAST_PAGE });
    expect(juzOfPage(LAST_PAGE)).toBe(30);
  });

  it('page counts cover the whole mushaf', () => {
    let total = 0;
    for (let j = 1; j <= 30; j++) total += juzPageCount(j);
    expect(total).toBe(LAST_PAGE);
    expect(juzPageCount(1)).toBe(21);
    expect(juzPageCount(30)).toBe(23);
  });

  it('lapsOfJuz keeps one juz only', () => {
    const laps = [{ page: 20, ms: 1 }, { page: 21, ms: 2 }, { page: 22, ms: 3 }, { page: 41, ms: 4 }];
    expect(lapsOfJuz(laps, 1).map((l) => l.page)).toEqual([20, 21]);
    expect(lapsOfJuz(laps, 2).map((l) => l.page)).toEqual([22, 41]);
  });
});
