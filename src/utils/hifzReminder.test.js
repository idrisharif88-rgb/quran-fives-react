import { describe, it, expect } from 'vitest';
import { upcomingTimes, shiftMinutes, timeText, DAYS_AHEAD } from './hifzReminder';

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

  it('moves the time in quarter hours around midnight, and shows it in 12-hour Arabic', () => {
    expect(shiftMinutes(0, -15)).toBe(1425);
    expect(shiftMinutes(1425, 15)).toBe(0);
    expect(timeText(20 * 60)).toBe('8:00 م');
    expect(timeText(0)).toBe('12:00 ص');
    expect(timeText(12 * 60 + 15)).toBe('12:15 م');
  });
});
