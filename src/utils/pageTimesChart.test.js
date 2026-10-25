import { describe, it, expect } from 'vitest';
import { chartSlots } from './pageTimesChart';

const times = (pages) => pages.map((page) => ({ page, seconds: 50 }));

describe('chartSlots', () => {
  it('always draws the whole block, unread pages empty', () => {
    const slots = chartSlots(times([22, 23, 24]));
    expect(slots.map((s) => s.page)).toEqual(Array.from({ length: 20 }, (_, i) => 22 + i));
    expect(slots.filter((s) => s.seconds !== null)).toHaveLength(3);
  });

  it('keeps a missing page in its place instead of shifting the bars', () => {
    const slots = chartSlots(times([22, 24]));
    expect(slots[1]).toEqual({ page: 23, seconds: null });
    expect(slots[2].page).toBe(24);
  });

  it('first juz is 21 pages, last is 23', () => {
    expect(chartSlots(times([1]))).toHaveLength(21);
    expect(chartSlots(times([600]))).toHaveLength(23);
  });

  it('a card across two juz spans its own pages', () => {
    const slots = chartSlots(times([35, 50]));
    expect(slots[0].page).toBe(35);
    expect(slots.at(-1).page).toBe(50);
  });
});

describe('compareWithPrevious', () => {
  it('states the difference for the whole card', async () => {
    const { compareWithPrevious } = await import('./sessions');
    const card = (juzNumber, avgSeconds, pages = 20) => ({ juzNumber, avgSeconds, pageTimes: Array(pages).fill({}) });
    expect(compareWithPrevious(card(2, 120), card(1, 123, 21))).toEqual({ faster: true, text: 'أسرع من الجزء 1 بـ 1:00' });
    expect(compareWithPrevious(card(2, 130), card(1, 120)).faster).toBe(false);
    expect(compareWithPrevious(card(2, 120), card(2, 120)).text).toBe('مثل البطاقة السابقة');
    expect(compareWithPrevious(card(2, 120), null)).toBeNull();
  });
});
