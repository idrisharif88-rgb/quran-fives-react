import { describe, it, expect } from 'vitest';
import { normalizePages, markPage, unmarkPage, pagesReadSince } from './khatmaPages';

describe('khatma pages', () => {
  it('marks, re-marks and unmarks a page', () => {
    let p = markPage({}, 5, 100);
    p = markPage(p, 5, 200);
    expect(p).toEqual({ 5: 200 });
    expect(unmarkPage(p, 5)).toEqual({});
    expect(unmarkPage(p, 9)).toBe(p);
  });

  it('refuses pages outside the mushaf', () => {
    const p = {};
    expect(markPage(p, 0, 1)).toBe(p);
    expect(markPage(p, 605, 1)).toBe(p);
  });

  it('drops damaged entries', () => {
    expect(normalizePages({ 3: 10, x: 1, 700: 2, 4: 'a' })).toEqual({ 3: 10 });
    expect(normalizePages(null)).toEqual({});
  });

  it('counts only pages after the given time', () => {
    expect([...pagesReadSince({ 1: 5, 2: 15 }, 10)]).toEqual([2]);
    expect(pagesReadSince({ 1: 5, 2: 15 }, null).size).toBe(2);
  });
});
