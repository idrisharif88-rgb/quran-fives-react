import { describe, it, expect } from 'vitest';
import { blockEndOf, blockStartOf, closingBlock, lapsOfBlock } from './pageBlocks';
import { JUZ_START_PAGES } from './juzPages';

describe('one counter block per juz', () => {
  it('ends at 21, 41, 61 … 581, then 604', () => {
    const ends = [];
    for (let p = 1; p <= 604; p++) if (closingBlock(p) != null) ends.push(p);
    expect(ends.slice(0, 3)).toEqual([21, 41, 61]);
    expect(ends.slice(-2)).toEqual([581, 604]);
    expect(ends).toHaveLength(30);
  });

  it('blocks start where the juz starts', () => {
    for (const start of JUZ_START_PAGES) expect(blockStartOf(blockEndOf(start))).toBe(start);
    expect(blockEndOf(1)).toBe(21);
    expect(blockEndOf(22)).toBe(41);
    expect(blockStartOf(604)).toBe(582);
  });

  it('every page belongs to exactly the block between its start and end', () => {
    for (let p = 1; p <= 604; p++) {
      const end = blockEndOf(p);
      expect(p).toBeGreaterThanOrEqual(blockStartOf(end));
      expect(p).toBeLessThanOrEqual(end);
    }
  });

  it('lapsOfBlock keeps only that block', () => {
    const laps = [20, 21, 22, 41, 42].map((page) => ({ page, ms: 1 }));
    expect(lapsOfBlock(laps, 41).map((l) => l.page)).toEqual([22, 41]);
  });
});
