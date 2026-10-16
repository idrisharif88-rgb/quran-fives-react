import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
};
globalThis.window = { localStorage: globalThis.localStorage };

// السيرفر والجهاز مُحاكَيان: remote فهرس السيرفر، local الملفات الموجودة على الجهاز
const remote = {};
const local = new Set();
let account = 'me@example.com';
let online = true;

vi.mock('./fileRemote', () => ({
  canReachServer: () => online,
  currentAccount: () => account,
  fetchRemoteIndex: async () => ({ ...remote }),
  uploadFile: async (kind, id, blob, { mime, meta }) => { remote[id] = { mime, size: 1, addedAt: 1, meta }; },
  deleteRemoteFile: async (kind, id) => { if (!online) throw new Error('offline'); delete remote[id]; },
  downloadFile: async () => null,
}));
vi.mock('./hifzRecordingStore', () => ({
  recordingPath: (id, mime) => `hifz-recordings/${id}.${mime === 'audio/mp4' ? 'm4a' : 'webm'}`,
  recordingExists: async (r) => local.has(r.id),
  readRecordingBlob: async () => new Blob(['x']),
  writeRecordingBlob: async () => {},
}));

const { syncRecordings, belongsHere, forgetRemote } = await import('./hifzRecordingSync');

const rec = (id, extra = {}) => ({ id, s: 1, a: 1, file: `hifz-recordings/${id}.webm`, mime: 'audio/webm', createdAt: Number(id), ...extra });

beforeEach(() => {
  mem.clear();
  local.clear();
  for (const k of Object.keys(remote)) delete remote[k];
  account = 'me@example.com';
  online = true;
});

describe('syncing «تسجيلاتي» with the account', () => {
  it('claims unowned recordings, uploads them, and adds what another device recorded', async () => {
    local.add('1');
    remote['5'] = { mime: 'audio/mp4', size: 1, addedAt: 9, meta: { s: 2, a: 3, createdAt: 5 } };
    const out = await syncRecordings([rec('1')]);
    expect(out.map((r) => r.id)).toEqual(['1', '5']);
    expect(out[0]).toMatchObject({ account: 'me@example.com', uploaded: true });
    expect(out[1]).toMatchObject({ s: 2, a: 3, file: 'hifz-recordings/5.m4a', uploaded: true });
    expect(remote['1'].meta).toMatchObject({ s: 1, a: 1 });
  });

  it("never uploads or shows another account's recordings", async () => {
    local.add('1');
    const theirs = rec('1', { account: 'other@example.com', uploaded: false });
    const out = await syncRecordings([theirs]);
    expect(remote['1']).toBeUndefined();
    expect(out[0].account).toBe('other@example.com');
    expect(belongsHere(out[0])).toBe(false);
  });

  it('changes nothing when signed out or offline', async () => {
    online = false;
    const list = [rec('1')];
    expect(await syncRecordings(list)).toBe(list);
  });

  it('retries a delete made offline, and does not bring the recording back meanwhile', async () => {
    remote['3'] = { mime: 'audio/webm', size: 1, addedAt: 3 };
    online = false;
    await forgetRemote(rec('3', { account: 'me@example.com', uploaded: true }));
    expect(remote['3']).toBeDefined();
    online = true;
    const out = await syncRecordings([]);
    expect(out).toEqual([]);
    expect(remote['3']).toBeUndefined();
  });
});
