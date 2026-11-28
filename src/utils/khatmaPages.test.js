import { describe, it, expect } from 'vitest';
import { normalizePages, markPage, unmarkPage, pagesReadSince, completesKhatma, lastKhatmaTime } from './khatmaPages';
import { LAST_PAGE } from '../data/juzPages';

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

describe('completesKhatma', () => {
  const all = (except, at = 10) => {
    const p = {};
    for (let i = 1; i <= LAST_PAGE; i++) if (i !== except) p[i] = at;
    return p;
  };
  it('fires on the last missing page, whatever the start', () => {
    expect(completesKhatma(all(399), 399, null)).toBe(true);
    expect(completesKhatma(all(604), 604, null)).toBe(true);
  });
  it('does not fire when pages are still missing', () => {
    const p = all(399); delete p[5];
    expect(completesKhatma(p, 399, null)).toBe(false);
  });
  it('does not fire again for a page already read', () => {
    expect(completesKhatma(all(0), 604, null)).toBe(false);
  });
  it('counts only pages after the last khatma', () => {
    expect(completesKhatma(all(399, 10), 399, 20)).toBe(false);
  });
  it('lastKhatmaTime', () => {
    expect(lastKhatmaTime([{ timestamp: 3 }, { timestamp: 9 }, {}])).toBe(9);
    expect(lastKhatmaTime([])).toBe(null);
  });
});
