import { describe, it, expect, beforeEach } from 'vitest';
import {
  readSyncedLocal, restoreSyncedLocal, saveStoredState, LOCAL_SYNC_EVENT,
  KHMASIYAT_QUIZ_STORAGE_KEY, PLAYBACK_RATE_STORAGE_KEY,
} from './persistence';

const mem = new Map();
const events = [];
globalThis.window = {
  localStorage: {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  },
  dispatchEvent: (e) => events.push(e.type),
};

describe('quiz progress and playback speed ride with the synced state', () => {
  beforeEach(() => { mem.clear(); events.length = 0; });

  it('reads what this device holds, and signals a change when one is saved', () => {
    saveStoredState(KHMASIYAT_QUIZ_STORAGE_KEY, { correctCount: 3 });
    saveStoredState(PLAYBACK_RATE_STORAGE_KEY, 1.5);
    saveStoredState('quran-fives-app-state-v1', {});
    expect(readSyncedLocal()).toEqual({ [KHMASIYAT_QUIZ_STORAGE_KEY]: { correctCount: 3 }, [PLAYBACK_RATE_STORAGE_KEY]: 1.5 });
    expect(events).toEqual([LOCAL_SYNC_EVENT, LOCAL_SYNC_EVENT]);   // حالة التطبيق لها مسارها
  });

  it('a download puts them back, leaving keys the cloud copy lacks', () => {
    saveStoredState(PLAYBACK_RATE_STORAGE_KEY, 2);
    restoreSyncedLocal({ [KHMASIYAT_QUIZ_STORAGE_KEY]: { correctCount: 9 } });
    expect(readSyncedLocal()).toEqual({ [KHMASIYAT_QUIZ_STORAGE_KEY]: { correctCount: 9 }, [PLAYBACK_RATE_STORAGE_KEY]: 2 });
    restoreSyncedLocal(undefined);   // نسخة سحابة قديمة بلا localStores
    expect(readSyncedLocal()[PLAYBACK_RATE_STORAGE_KEY]).toBe(2);
  });
});
