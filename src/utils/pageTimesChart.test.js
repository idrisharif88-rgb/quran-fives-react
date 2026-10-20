import { describe, it, expect } from 'vitest';
import { chartSlots, axisFor } from './pageTimesChart';

const times = (pages) => pages.map((page) => ({ page, seconds: 50 }));

describe('chartSlots', () => {
  it('always draws the whole block, unread pages empty', () => {
    const slots = chartSlots(times([22, 23, 24]));
    expect(slots.map((s) => s.page)).toEqual([22, 23, 24, 25, 26, 27, 28, 29, 30, 31]);
    expect(slots.filter((s) => s.seconds !== null)).toHaveLength(3);
  });

  it('keeps a missing page in its place instead of shifting the bars', () => {
    const slots = chartSlots(times([22, 24]));
    expect(slots[1]).toEqual({ page: 23, seconds: null });
    expect(slots[2].page).toBe(24);
  });

  it('first block is 11 pages, last is 13', () => {
    expect(chartSlots(times([1]))).toHaveLength(11);
    expect(chartSlots(times([600]))).toHaveLength(13);
  });

  it('an old full-juz card spans its own pages', () => {
    const slots = chartSlots(times([22, 41]));
    expect(slots[0].page).toBe(22);
    expect(slots.at(-1).page).toBe(41);
  });
});

describe('axisFor', () => {
  it('rounds up to a clean step with at most four intervals', () => {
    expect(axisFor(52)).toEqual({ max: 60, ticks: [0, 15, 30, 45, 60] });
    expect(axisFor(95)).toEqual({ max: 120, ticks: [0, 30, 60, 90, 120] });
    expect(axisFor(400).ticks.length).toBeLessThanOrEqual(5);
  });
});
