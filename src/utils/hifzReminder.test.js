import { describe, it, expect } from 'vitest';
import { upcomingTimes, DAYS_AHEAD } from './hifzReminder';

const at = (d) => `${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;

describe('daily hifz reminder schedule', () => {
  it('schedules a week ahead, starting today if the time has not passed', () => {
    const now = new Date(2026, 9, 17, 10, 0);
    const times = upcomingTimes(20 * 60, now);
    expect(times).toHaveLength(DAYS_AHEAD);
    expect(at(times[0])).toBe('17 20:0');
    expect(at(times[6])).toBe('23 20:0');
  });

  it("skips today when its time has passed or today's portion is done", () => {
    expect(at(upcomingTimes(8 * 60, new Date(2026, 9, 17, 10, 0))[0])).toBe('18 8:0');
    expect(at(upcomingTimes(20 * 60, new Date(2026, 9, 17, 10, 0), true)[0])).toBe('18 20:0');
    expect(upcomingTimes(20 * 60, new Date(2026, 9, 17, 10, 0), true)).toHaveLength(DAYS_AHEAD);
  });
});
