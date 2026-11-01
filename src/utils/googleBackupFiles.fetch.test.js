import { describe, it, expect, beforeEach, vi } from 'vitest';

const m = vi.hoisted(() => ({ email: 'a@example.com', token: 't', files: [], written: [] }));
vi.mock('./googleDrive', () => ({
  linkedEmail: () => m.email,
  getAccessToken: async (o) => { m.interactive = o.interactive; return m.token; },
  listFiles: async () => m.files,
  readBlob: async (_t, id) => `blob-${id}`,
  uploadBlob: async () => {},
  deleteFile: async () => {},
}));
vi.mock('./persistence', () => ({ loadStoredState: () => null, saveStoredState: () => {} }));
vi.mock('./fileRemote', () => ({ currentAccount: () => 'a' }));
vi.mock('./hifzRecordingStore', () => ({
  loadRecordingIndex: () => [], saveRecordingIndex: () => {}, recordingExists: async () => false, readRecordingBlob: async () => null,
  writeRecordingBlob: async (r, b) => { m.written.push([r.id, b]); },
}));
vi.mock('./hifzRecordingSync', () => ({ belongsHere: () => true, ensureLocal: async () => {} }));
vi.mock('./ijazaFileStore', () => ({ loadIjazaFiles: () => ({}), saveIjazaFiles: () => {}, hasLocal: async () => false, readLocalBlob: async () => null, writeLocal: async () => {}, ensureIjazaLocal: async () => {} }));

const { fetchRecordingFromDrive } = await import('./googleBackupFiles');
const recording = { id: '7', file: 'hifz-recordings/7.webm' };

beforeEach(() => Object.assign(m, { email: 'a@example.com', token: 't', files: [{ id: 'd7', name: 'hifz-7.webm' }], written: [] }));

describe('fetchRecordingFromDrive', () => {
  it('brings the file back without opening the Google window', async () => {
    expect(await fetchRecordingFromDrive(recording)).toBe(true);
    expect(m.interactive).toBe(false);
    expect(m.written).toEqual([['7', 'blob-d7']]);
  });

  it('reports false when Drive has no copy or is not linked', async () => {
    m.files = [];
    expect(await fetchRecordingFromDrive(recording)).toBe(false);
    m.email = null;
    expect(await fetchRecordingFromDrive(recording)).toBe(false);
    expect(m.written).toEqual([]);
  });
});
