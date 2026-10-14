import { describe, it, expect } from 'vitest';
import { hijriFromTable, hijriTableCoverage, monthStart, HIJRI_MONTH_STARTS, PENDING_DAWN_MOON } from './hijriDate';
import { HIJRI_MOONS } from '../constants/hijriMonths';
import { daysBetween } from './hifzSchedule';

const on = (y, m, d) => new Date(y, m - 1, d, 12);

describe('monthStart (the dawn rule)', () => {
  it('a moon before 04:00 makes its own day the first; from 05:00 the next day', () => {
    expect(monthStart({ moon: '2026-12-09 03:51' })).toBe('2026-12-09');
    expect(monthStart({ moon: '2026-06-15 05:54' })).toBe('2026-06-16');
    expect(monthStart({ moon: '2026-05-16 23:01' })).toBe('2026-05-17');
    expect(monthStart({ moon: '2026-05-16 05:00' })).toBe('2026-05-17');
  });

  it('between 04:00 and 05:00 waits for the owner\'s decision', () => {
    expect(monthStart({ moon: '2027-04-07 04:30' })).toBeNull();
    expect(monthStart({ moon: '2027-04-07 04:30', start: '2027-04-07' })).toBe('2027-04-07');
  });

  it('every month in the approved table is 29 or 30 days, and none waits', () => {
    expect(HIJRI_MONTH_STARTS).toHaveLength(HIJRI_MOONS.length);
    expect(PENDING_DAWN_MOON).toBeNull();
    for (let i = 1; i < HIJRI_MONTH_STARTS.length; i++) {
      expect([29, 30]).toContain(daysBetween(HIJRI_MONTH_STARTS[i - 1].start, HIJRI_MONTH_STARTS[i].start));
    }
  });
});

describe('hijriFromTable', () => {
  it('counts days from each month start', () => {
    expect(hijriFromTable(on(2026, 5, 17))).toEqual({ year: 1447, month: 12, day: 1 });
    expect(hijriFromTable(on(2026, 5, 29))).toEqual({ year: 1447, month: 12, day: 13 });
    expect(hijriFromTable(on(2026, 6, 15))).toEqual({ year: 1447, month: 12, day: 30 });
    expect(hijriFromTable(on(2026, 6, 16))).toEqual({ year: 1448, month: 1, day: 1 });
    expect(hijriFromTable(on(2026, 10, 7))).toEqual({ year: 1448, month: 4, day: 26 });
    expect(hijriFromTable(on(2026, 10, 14))).toEqual({ year: 1448, month: 5, day: 4 });
  });

  it('knows nothing outside the table', () => {
    expect(hijriFromTable(on(2026, 5, 16))).toBeNull();
    expect(hijriFromTable(on(2027, 4, 7))).toEqual({ year: 1448, month: 10, day: 30 });   // آخر شهر: ثلاثون يوماً
    expect(hijriFromTable(on(2027, 4, 8))).toBeNull();
  });
});

describe('hijriTableCoverage', () => {
  it('counts the months after the current one', () => {
    expect(hijriTableCoverage(on(2026, 10, 14))).toMatchObject({ monthId: '1448-5', ahead: 5 });
    expect(hijriTableCoverage(on(2027, 3, 10))).toMatchObject({ monthId: '1448-10', ahead: 0 });
    expect(hijriTableCoverage(on(2027, 5, 1))).toMatchObject({ monthId: 'none-2027-5', ahead: 0 });
  });
});
