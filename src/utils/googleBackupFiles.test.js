import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
};
globalThis.window = { localStorage: globalThis.localStorage };

const drive = new Map();   // name → { id, blob }
const local = new Set();   // ملفّات الجهاز
const uploads = [];
const deletes = [];
let recordings = [];
let ijazat = {};

vi.mock('./googleDrive', () => ({
  linkedEmail: () => 'me@gmail.com',
  listFiles: async () => [...drive].map(([name, f]) => ({ id: f.id, name })),
  uploadBlob: async (_t, name, blob) => { uploads.push(name); drive.set(name, { id: 'd-' + name, blob }); },
  readBlob: async (_t, id) => [...drive.values()].find(f => f.id === id).blob,
  deleteFile: async (_t, id) => { deletes.push(id); for (const [n, f] of drive) if (f.id === id) drive.delete(n); },
}));
vi.mock('./fileRemote', () => ({ currentAccount: () => 'user@x.com' }));
vi.mock('./hifzRecordingSync', () => ({
  belongsHere: r => !r.account || r.account === 'user@x.com',
  ensureLocal: async () => {},
}));
vi.mock('./hifzRecordingStore', () => ({
  loadRecordingIndex: () => recordings,
  saveRecordingIndex: list => { recordings = list; },
  recordingExists: async r => local.has(r.file),
  readRecordingBlob: async r => 'blob:' + r.file,
  writeRecordingBlob: async r => { local.add(r.file); },
}));
vi.mock('./ijazaFileStore', () => ({
  loadIjazaFiles: () => ijazat,
  saveIjazaFiles: i => { ijazat = i; },
  hasLocal: async id => local.has('ij-' + id),
  readLocalBlob: async id => 'blob:ij-' + id,
  writeLocal: async id => { local.add('ij-' + id); },
  ensureIjazaLocal: async () => {},
}));

const { backupFiles, restoreFiles } = await import('./googleBackupFiles');

const rec = (id, extra = {}) => ({ id, file: `hifz-recordings/${id}.webm`, createdAt: Number(id), ...extra });

beforeEach(() => {
  mem.clear(); drive.clear(); local.clear();
  uploads.length = 0; deletes.length = 0;
  recordings = []; ijazat = {};
});

describe('Drive file backup', () => {
  it('uploads each file once, and only this account\'s recordings', async () => {
    recordings = [rec('1'), rec('2', { account: 'other@x.com' })];
    ijazat = { a: { name: 'x.pdf', addedAt: 5 } };
    expect(await backupFiles('t')).toBe(0);
    expect(uploads).toEqual(['hifz-1.webm', 'ijaza-a-5.pdf']);
    await backupFiles('t');
    expect(uploads).toHaveLength(2);
  });

  it('deletes from Drive what was deleted here, and a re-attached ijaza replaces the old file', async () => {
    recordings = [rec('1'), rec('2')];
    ijazat = { a: { addedAt: 5 } };
    await backupFiles('t');
    recordings = [rec('2')];
    ijazat = { a: { addedAt: 9 } };
    await backupFiles('t');
    expect([...drive.keys()].sort()).toEqual(['hifz-2.webm', 'ijaza-a-9.pdf']);
  });

  it('a fresh device never deletes Drive files it did not upload or restore', async () => {
    drive.set('hifz-1.webm', { id: 'old', blob: 'b' });
    await backupFiles('t');
    expect(deletes).toEqual([]);
    expect(drive.has('hifz-1.webm')).toBe(true);
  });

  it('restore adds the backup\'s entries, keeps local ones, and downloads missing files', async () => {
    drive.set('hifz-1.webm', { id: 'd1', blob: 'b' });
    drive.set('ijaza-a-5.pdf', { id: 'd2', blob: 'b' });
    recordings = [rec('3')];
    ijazat = { b: { addedAt: 1 } };
    await restoreFiles('t', { hifz: [rec('1')], ijaza: { a: { addedAt: 5 } } });
    expect(recordings.map(r => r.id)).toEqual(['1', '3']);
    expect(Object.keys(ijazat).sort()).toEqual(['a', 'b']);
    expect(local.has('hifz-recordings/1.webm')).toBe(true);
    expect(local.has('ij-a')).toBe(true);
    // ما استُرجع صار متتبَّعاً: حذفه هنا يحذفه من درايف
    recordings = [rec('3')];
    await backupFiles('t');
    expect(drive.has('hifz-1.webm')).toBe(false);
  });
});
