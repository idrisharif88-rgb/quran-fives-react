import { describe, it, expect } from 'vitest';
import { summarizeBackup } from './backupSummary';

const APP = 'quran-fives-app-state-v1';
const full = {
  data: {
    [APP]: {
      nightCounters: [{ id: 'a', value: 2 }, { id: 'b', value: 13 }],
      activeNightCounterId: 'b',
      sessions: [{}, {}],
      stopwatchBestJuzMs: 60000,
      hifz: { direction: 'forward', origin: 0, startedOn: '2026-06-03', rules: { versesPerDay: 5 }, memorizedOn: Array(8).fill('2026-06-03') },
      verseNotes: { '1:1': 'x', '1:2': 'y' },
      starredByStep: { 5: [1, 2], 7: [3] },
      starredIndices: [1, 2],
      starredPages: [9],
      ijazat: [{ id: 1 }],
    },
    'quran-fives-khitma-cache-v1': { list: [{ id: 1 }, { id: 2 }] },
    'quran-fives-khmasiyat-quiz-v1': { score: 1 },
  },
  files: { hifz: [{ id: 'r1' }, { id: 'r2', type: 'review' }, { id: 'r3' }], ijaza: {} },
};

describe('summarizeBackup', () => {
  it('reads every section in the user\'s terms', () => {
    const s = summarizeBackup(full);
    expect(s.isEmpty).toBe(false);
    expect(s.counter).toEqual({ page: 13, cards: 2, bestJuzMs: 60000 });
    expect(s.hifz).toEqual({ verses: 8, reached: 'البقرة 1', versesPerDay: 5, startedOn: '2026-06-03' });
    expect(s.recordings).toEqual({ hifz: 2, review: 1 });
    expect(s).toMatchObject({ notes: 2, stars: 4, khatmas: 2, ijazat: 1, quizzes: 1 });
    expect(s.sentence).toBe('نسختك فيها: العدّاد عند صفحة 13، والآيات المحفوظة 8، والتسجيلات 3، والتفسير 2.');
  });

  it('names the last verse by memorising direction and start', () => {
    const app = { hifz: { direction: 'forward', origin: 7, memorizedOn: ['d'] } };
    expect(summarizeBackup({ data: { [APP]: app } }).hifz.reached).toBe('البقرة 1');
  });

  it('calls a backup with no content empty, whatever its preferences', () => {
    const s = summarizeBackup({ data: { [APP]: { fontSize: 40, nightCounters: [{ id: 'c', value: 0 }] }, 'quran-fives-khmasiyat-quiz-v1': {} }, files: { hifz: [] } });
    expect(s.isEmpty).toBe(true);
    expect(s.sentence).toBe('');
  });

  it('recordings or khatmas alone are not empty', () => {
    expect(summarizeBackup({ data: {}, files: { hifz: [{ id: 'r' }] } }).isEmpty).toBe(false);
    expect(summarizeBackup({ data: { 'quran-fives-khitma-cache-v1': { list: [{}] } } }).isEmpty).toBe(false);
  });

  it('survives a damaged file', () => {
    for (const bad of [null, {}, { data: 'x' }, { data: { [APP]: { hifz: 'x', nightCounters: 'x' } }, files: 'x' }]) {
      expect(() => summarizeBackup(bad)).not.toThrow();
    }
  });
});
