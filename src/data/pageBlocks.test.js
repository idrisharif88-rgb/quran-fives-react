import { describe, it, expect } from 'vitest';
import { blockEndOf, blockStartOf, closingBlock, lapsOfBlock } from './pageBlocks';

describe('ten-page counter blocks', () => {
  it('ends at 11, 21, 31 … 591, then 604', () => {
    const ends = [];
    for (let p = 1; p <= 604; p++) if (closingBlock(p) != null) ends.push(p);
    expect(ends[0]).toBe(11);
    expect(ends.slice(1, 4)).toEqual([21, 31, 41]);
    expect(ends.slice(-2)).toEqual([591, 604]);
    expect(ends).toHaveLength(60);
  });

  it('first block is 1–11 and the last is the 13 pages 592–604', () => {
    expect(blockStartOf(11)).toBe(1);
    expect(blockEndOf(1)).toBe(11);
    expect(blockEndOf(12)).toBe(21);
    expect(blockEndOf(21)).toBe(21);
    expect(blockEndOf(22)).toBe(31);
    expect(blockStartOf(604)).toBe(592);
    expect(blockEndOf(592)).toBe(604);
    expect(blockEndOf(591)).toBe(591);
  });

  it('every page belongs to exactly the block between its start and end', () => {
    for (let p = 1; p <= 604; p++) {
      const end = blockEndOf(p);
      expect(p).toBeGreaterThanOrEqual(blockStartOf(end));
      expect(p).toBeLessThanOrEqual(end);
    }
  });

  it('lapsOfBlock keeps only that block', () => {
    const laps = [10, 11, 12, 21, 22].map((page) => ({ page, ms: 1 }));
    expect(lapsOfBlock(laps, 21).map((l) => l.page)).toEqual([12, 21]);
  });
});
