import { describe, it, expect } from 'vitest';
import { upsertLap, closingJuz, summarizeJuz } from './juzSessions';
import { buildSessionFromLaps } from './sessions';

// يحاكي العدّاد: كل ضغطة تُنهي صفحة وتبدأ التي تليها.
// يعيد البطاقات التي ظهرت مع رقم الصفحة التي بدأت لحظة ظهورها.
function readPages(from, to, { skip = [] } = {}) {
  let laps = [];
  const seen = new Set();
  const cards = [];
  for (let page = from; page <= to; page++) {
    if (!skip.includes(page)) laps = upsertLap(laps, page, 60000 + page);
    const juz = closingJuz(page);
    if (juz == null || seen.has(juz)) continue;
    const summary = summarizeJuz(laps, juz);
    if (!summary) continue;
    seen.add(juz);
    cards.push({ shownAtStartOfPage: page + 1, summary, session: buildSessionFromLaps(summary.laps, null, null) });
  }
  return cards;
}

describe('juz result cards', () => {
  it('reading pages 1–41 gives two separate cards, at the start of pages 22 and 42', () => {
    const cards = readPages(1, 41);
    expect(cards.map((c) => c.shownAtStartOfPage)).toEqual([22, 42]);

    const [first, second] = cards.map((c) => c.session);
    expect(first).toMatchObject({ juzNumber: 1, startPage: 1, endPage: 21 });
    expect(first.pageTimes).toHaveLength(21);
    expect(second).toMatchObject({ juzNumber: 2, startPage: 22, endPage: 41 });
    expect(second.pageTimes).toHaveLength(20);

    const firstPages = new Set(first.pageTimes.map((p) => p.page));
    expect(second.pageTimes.some((p) => firstPages.has(p.page))).toBe(false);
    expect(cards.every((c) => c.summary.complete)).toBe(true);
  });

  it('no card appears on the last page of a juz, only after it is finished', () => {
    expect(readPages(1, 20)).toHaveLength(0);
    expect(closingJuz(20)).toBeNull();
    expect(closingJuz(21)).toBe(1);
    expect(closingJuz(22)).toBeNull();
  });

  it('starting mid-juz gives one smaller card, not counted as a complete juz', () => {
    const cards = readPages(10, 21);
    expect(cards).toHaveLength(1);
    expect(cards[0].shownAtStartOfPage).toBe(22);
    expect(cards[0].session).toMatchObject({ juzNumber: 1, startPage: 10, endPage: 21 });
    expect(cards[0].session.pageTimes).toHaveLength(12);
    expect(cards[0].summary.complete).toBe(false);
  });

  it('a skipped page still gives a card for that juz', () => {
    const cards = readPages(1, 21, { skip: [7, 21] });
    expect(cards).toHaveLength(1);
    expect(cards[0].session.pageTimes).toHaveLength(19);
    expect(cards[0].summary.complete).toBe(false);
  });

  it('a card never holds more than its own juz, across the whole mushaf', () => {
    const cards = readPages(1, 604);
    expect(cards).toHaveLength(30);
    cards.forEach((c, i) => {
      expect(c.session.juzNumber).toBe(i + 1);
      expect(c.session.pageTimes.length).toBeLessThanOrEqual(23);
      expect(c.summary.complete).toBe(true);
    });
    expect(cards.reduce((n, c) => n + c.session.pageTimes.length, 0)).toBe(604);
  });

  it('re-reading a page replaces its time instead of adding a page', () => {
    const laps = upsertLap(upsertLap([{ page: 1, ms: 10 }], 2, 20), 1, 99);
    expect(laps).toEqual([{ page: 1, ms: 99 }, { page: 2, ms: 20 }]);
  });
});
