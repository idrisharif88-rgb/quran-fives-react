import { describe, it, expect } from 'vitest';
import { mergeStates, deepEqual } from './syncMerge';

describe('mergeStates', () => {
  it('takes the side that changed', () => {
    const base = { a: 1, b: 1 };
    expect(mergeStates(base, { a: 2, b: 1 }, { a: 1, b: 3 })).toEqual({ a: 2, b: 3 });
  });

  it('newest wins when both change one value', () => {
    expect(mergeStates({ a: 1 }, { a: 2 }, { a: 3 }, 'local')).toEqual({ a: 2 });
    expect(mergeStates({ a: 1 }, { a: 2 }, { a: 3 }, 'remote')).toEqual({ a: 3 });
  });

  it('merges keyed notes and keeps deletes', () => {
    const base = { verseNotes: { '1:1': 'x', '1:2': 'y' } };
    const local = { verseNotes: { '1:1': 'x', '2:5': 'new local' } };          // حذف 1:2
    const remote = { verseNotes: { '1:1': 'x', '1:2': 'y', '3:3': 'new remote' } };
    expect(mergeStates(base, local, remote).verseNotes).toEqual({ '1:1': 'x', '2:5': 'new local', '3:3': 'new remote' });
  });

  it('merges the notebook by id inside localStores', () => {
    const k = 'quran-fives-updates-notebook-v1';
    const n1 = { id: 'n1', title: 'a', updatedAt: 1 };
    const base = { localStores: { [k]: [n1] } };
    const local = { localStores: { [k]: [{ ...n1, title: 'edited' }, { id: 'n2', title: 'phone' }] } };
    const remote = { localStores: { [k]: [n1, { id: 'n3', title: 'tablet' }] } };
    expect(mergeStates(base, local, remote).localStores[k].map((n) => n.title)).toEqual(['edited', 'phone', 'tablet']);
  });

  it('drops an item deleted on one side', () => {
    const base = { nightCounters: [{ id: 'a', value: 1 }, { id: 'b', value: 2 }] };
    const local = { nightCounters: [{ id: 'a', value: 1 }] };
    const remote = { nightCounters: [{ id: 'a', value: 5 }, { id: 'b', value: 2 }] };
    expect(mergeStates(base, local, remote).nightCounters).toEqual([{ id: 'a', value: 5 }]);
  });

  it('treats stars as sets', () => {
    const base = { starredPages: [1, 2], starredByStep: { 5: [10] } };
    const local = { starredPages: [1, 2, 3], starredByStep: { 5: [] } };
    const remote = { starredPages: [2, 4], starredByStep: { 5: [10, 11] } };
    const out = mergeStates(base, local, remote);
    expect(out.starredPages.sort()).toEqual([2, 3, 4]);
    expect(out.starredByStep[5]).toEqual([11]);
  });

  it('keeps positional arrays whole', () => {
    expect(mergeStates({ s: [0, 0] }, { s: [1, 0] }, { s: [0, 1] }, 'remote')).toEqual({ s: [0, 1] });
  });

  it('without a base keeps additions from both sides', () => {
    const out = mergeStates(null, { verseNotes: { a: 1 }, x: 1 }, { verseNotes: { b: 2 }, x: 2 }, 'remote');
    expect(out).toEqual({ verseNotes: { a: 1, b: 2 }, x: 2 });
  });

  it('deepEqual ignores key order and undefined', () => {
    expect(deepEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1, z: undefined })).toBe(true);
  });
});
