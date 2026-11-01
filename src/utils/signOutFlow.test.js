import { describe, it, expect } from 'vitest';
import { IDLE, FAILURE, signOutReducer, classifyFailure, lossSummary } from './signOutFlow';

const run = (...actions) => actions.reduce(signOutReducer, IDLE);
const open = { type: 'open', switching: true };
const start = { type: 'start' };
const fail = { type: 'fail', failure: { kind: FAILURE.OFFLINE } };

describe('sign-out steps', () => {
  it('reaches the wipe only after a confirmed save', () => {
    expect(run(open).step).toBe('confirm');
    expect(run(open, start).step).toBe('saving');
    expect(run(open, start, { type: 'saved' })).toEqual({ step: 'wiping', switching: true });
  });

  it('a save result can not skip the confirm step', () => {
    expect(run({ type: 'saved' })).toEqual(IDLE);
    expect(run(open, { type: 'saved' }).step).toBe('confirm');
    expect(run(open, { type: 'wipe' }).step).toBe('confirm');
  });

  it('a failed save does not wipe, and can be retried', () => {
    const failed = run(open, start, fail);
    expect(failed.step).toBe('failed');
    expect(failed.failure.kind).toBe(FAILURE.OFFLINE);
    expect(signOutReducer(failed, start).step).toBe('saving');
  });

  it('a save result arriving after a cancel changes nothing', () => {
    const cancelled = run(open, start, { type: 'back' });
    expect(cancelled).toEqual(IDLE);
    expect(signOutReducer(cancelled, { type: 'saved' })).toEqual(IDLE);
  });

  it('back from the delete screen returns to the failure, not to idle', () => {
    const del = run(open, start, fail, { type: 'askDelete' });
    expect(del.step).toBe('confirmDelete');
    expect(signOutReducer(del, { type: 'back' }).step).toBe('failed');
  });

  it('back is ignored once the wipe began', () => {
    const wiping = run(open, start, { type: 'saved' });
    expect(signOutReducer(wiping, { type: 'back' })).toEqual(wiping);
  });
});

describe('classifyFailure', () => {
  it('names each failure', () => {
    expect(classifyFailure({ status: 409 }).kind).toBe(FAILURE.CONFLICT);
    expect(classifyFailure({ status: 401 }).kind).toBe(FAILURE.EXPIRED);
    expect(classifyFailure({ status: 403 }).kind).toBe(FAILURE.NO_DESTINATION);
    expect(classifyFailure({ status: 500 }, true).kind).toBe(FAILURE.UNREACHABLE);
    expect(classifyFailure(new Error('network'), false).kind).toBe(FAILURE.OFFLINE);
  });
});

describe('lossSummary', () => {
  it('lists only what this device really holds', () => {
    const lines = lossSummary({
      nightCounters: [{ id: 'a', value: 0 }, { id: 'b', value: 13 }],
      sessions: [{}, {}],
      starredByStep: { 5: [1, 2], 7: [3] },
      starredPages: [4],
      verseNotes: { x: 'n' },
    });
    expect(lines).toEqual(expect.arrayContaining(['العدّاد عند صفحة 13', 'بطاقات الأجزاء: 2', 'المثبّتات: 4', 'الملاحظات: 1']));
    expect(lines.some(l => l.includes('الحفظ') || l.includes('الإجازات'))).toBe(false);
  });
});
