import { describe, it, expect } from 'vitest';
import { partsRead, khatmaProgress, khatmaAverage, KHATMA_EPOCH } from './khatmaProgress';

const at = (y, m, d) => new Date(y, m - 1, d, 12).getTime();

describe('partsRead', () => {
  it('counts whole and partial parts by their real page counts', () => {
    expect(partsRead(0)).toBe(0);
    expect(partsRead(21)).toBe(1);            // الجزء الأول 21 صفحة
    expect(partsRead(41)).toBe(2);
    expect(partsRead(31)).toBeCloseTo(1.5);   // نصف الجزء الثاني (20 صفحة)
    expect(partsRead(604)).toBe(30);
    expect(partsRead(700)).toBe(30);
  });
});

describe('khatmaProgress (10-day limit)', () => {
  it('the khatma day is not counted: finished 3 days ago means today is day 3', () => {
    const p = khatmaProgress({ lastKhatmaAt: at(2026, 10, 11), page: 1, today: '2026-10-14' });
    expect(p).toMatchObject({ dayNumber: 3, read: 0, left: 30, daysLeft: 8 });
    expect(p.rate).toBeCloseTo(30 / 8);
    expect(p.status).toBe('speedUp');
  });

  it('on the khatma day itself day 1 starts tomorrow and all ten days are ahead', () => {
    const p = khatmaProgress({ lastKhatmaAt: at(2026, 10, 14), page: 1, today: '2026-10-14' });
    expect(p).toMatchObject({ dayNumber: 0, daysLeft: 10, status: 'onTrack' });
    expect(p.rate).toBeCloseTo(3);
  });

  it('27 Rabi al-Akhir to 5 Jumada al-Ula is day 7 with 4 days left', () => {
    expect(khatmaProgress({ lastKhatmaAt: at(2026, 10, 7), page: 1, today: '2026-10-14' })).toMatchObject({ dayNumber: 7, daysLeft: 4 });
  });

  it('is on track when the needed pace is 3 parts a day or less', () => {
    // اليوم الثالث وقد أنهى 9 أجزاء (الصفحة 182 = أول العاشر): الباقي 21 في 8 أيام
    const p = khatmaProgress({ lastKhatmaAt: at(2026, 10, 11), page: 182, today: '2026-10-14' });
    expect(p.read).toBe(9);
    expect(p.rate).toBeCloseTo(21 / 8);
    expect(p.status).toBe('onTrack');
  });

  it('is at risk when the needed pace passes one and a half times the base', () => {
    const p = khatmaProgress({ lastKhatmaAt: at(2026, 10, 6), page: 22, today: '2026-10-14' });   // اليوم 8، الباقي 29 في 3 أيام
    expect(p).toMatchObject({ dayNumber: 8, daysLeft: 3, status: 'atRisk' });
  });

  it('is late once the tenth day has passed, and done at the last page', () => {
    expect(khatmaProgress({ lastKhatmaAt: at(2026, 10, 1), page: 300, today: '2026-10-14' })).toMatchObject({ status: 'late', rate: null });
    expect(khatmaProgress({ lastKhatmaAt: at(2026, 10, 1), page: 605, today: '2026-10-14' })).toMatchObject({ status: 'done', left: 0 });
  });

  it('counts from the fixed start date when no khatma is registered', () => {
    // 29 مايو لا يُعدّ ← 1 يونيو الثالث
    expect(khatmaProgress({ lastKhatmaAt: null, page: 1, today: '2026-06-01' }).dayNumber).toBe(3);
  });
});

describe('khatmaAverage (since 13 Dhu al-Hijjah 1447)', () => {
  it('13 Dhu al-Hijjah 1447 comes from the approved moon table: 1 Dhu al-Hijjah = 17 May 2026', () => {
    expect(KHATMA_EPOCH).toBe('2026-05-29');
  });

  it('divides the days since the start by the khatmas registered in them', () => {
    const stamps = [at(2026, 5, 1), at(2026, 6, 8), at(2026, 6, 17), at(2026, 6, 26), at(2026, 7, 4)];
    const a = khatmaAverage({ timestamps: stamps, today: '2026-07-04' });   // 36 يوماً، 4 ختمات بعد البداية
    expect(a).toMatchObject({ days: 36, count: 4 });
    expect(a.average).toBeCloseTo(9);
  });

  it('has no average before the first khatma', () => {
    expect(khatmaAverage({ timestamps: [], today: '2026-07-04' })).toMatchObject({ count: 0, average: null });
  });
});
