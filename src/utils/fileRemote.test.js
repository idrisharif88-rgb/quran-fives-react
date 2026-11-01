import { describe, it, expect, beforeEach, vi } from 'vitest';

const fs = vi.hoisted(() => ({ calls: [], failDownload: null }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Filesystem: {
    mkdir: async (o) => { fs.calls.push(['mkdir', o.path]); throw new Error('already exists'); },
    downloadFile: async (o) => { fs.calls.push(['download', o.path]); if (fs.failDownload) throw fs.failDownload; },
    rename: async (o) => { fs.calls.push(['rename', o.from, o.to]); },
    deleteFile: async (o) => { fs.calls.push(['delete', o.path]); },
  },
}));
vi.mock('./syncConfig', () => ({ SYNC_URL: 'https://x', SYNC_ENABLED: true }));
vi.mock('./syncAccount', () => ({ readAccount: () => ({ user: 'a' }), readAccountStatus: () => null, authHeaders: () => ({}) }));

const { downloadFile } = await import('./fileRemote');

beforeEach(() => { fs.calls = []; fs.failDownload = null; });

describe('downloadFile on the phone', () => {
  it('creates the folder first: the Android download ignores recursive', async () => {
    await downloadFile('hifz', '1', 'hifz-recordings/1.webm');
    expect(fs.calls[0]).toEqual(['mkdir', 'hifz-recordings']);
    expect(fs.calls.at(-1)).toEqual(['rename', 'hifz-recordings/1.webm.part', 'hifz-recordings/1.webm']);
  });

  it('a dropped download leaves no file that looks complete', async () => {
    fs.failDownload = new Error('network');
    await expect(downloadFile('hifz', '1', 'hifz-recordings/1.webm')).rejects.toThrow('network');
    expect(fs.calls.some(([op]) => op === 'rename')).toBe(false);
    expect(fs.calls.at(-1)).toEqual(['delete', 'hifz-recordings/1.webm.part']);
  });
});
