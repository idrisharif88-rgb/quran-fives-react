import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
};
const listeners = new Set();
globalThis.window = {
  localStorage: globalThis.localStorage,
  addEventListener: (_, fn) => listeners.add(fn),
  removeEventListener: (_, fn) => listeners.delete(fn),
  dispatchEvent: () => { listeners.forEach(fn => fn()); return true; },
};

const drive = vi.hoisted(() => ({ token: null, file: null, content: '', saved: [], duringFiles: () => {} }));
vi.mock('./googleBackupFiles', () => ({ filesIndex: () => ({ hifz: [], ijaza: {} }), backupFiles: async () => 0, restoreFiles: async () => drive.duringFiles() }));
vi.mock('./googleDrive', () => ({
  getAccessToken: async () => drive.token,
  findFile: async () => drive.file,
  saveFile: async (_t, _n, body) => { drive.saved.push(body); return {}; },
  readFile: async () => drive.content,
  linkedEmail: () => drive.email,
  unlinkGoogle: () => { drive.unlinked = true; return drive.unlinkResult; },
}));

const { buildBackup, applyBackup, restoreBackup, readRemoteBackup, linkGoogle, dailyBackupIfDue, forgetGoogleLink, lastBackupAt, BACKUP_KEYS } = await import('./googleBackup');

const APP_KEY = 'quran-fives-app-state-v1';
const counterAt = (value) => ({ nightCounters: [{ id: 'counter-1', value }] });
const appState = () => JSON.parse(localStorage.getItem(APP_KEY));

beforeEach(() => {
  mem.clear();
  listeners.clear();
  Object.assign(drive, { token: null, file: null, content: '', saved: [], duringFiles: () => {}, email: null, unlinked: false, unlinkResult: Promise.resolve() });
});

describe('Google Drive backup file', () => {
  it('carries the user data but never the sign-in or device-file indexes', () => {
    localStorage.setItem('quran-fives-app-state-v1', JSON.stringify({ currentIndex: 7 }));
    localStorage.setItem('quran-fives-khitma-creds-v1', JSON.stringify({ user: 'a', code: 'secret' }));
    localStorage.setItem('quran-fives-hifz-recordings-v1', JSON.stringify([{ id: '1' }]));
    const backup = buildBackup(123);
    expect(backup).toMatchObject({ app: 'khumassiyat', version: 2, savedAt: 123, files: { hifz: [], ijaza: {} } });
    expect(backup.data['quran-fives-app-state-v1']).toEqual({ currentIndex: 7 });
    expect(Object.keys(backup.data)).not.toContain('quran-fives-khitma-creds-v1');
    expect(Object.keys(backup.data)).not.toContain('quran-fives-hifz-recordings-v1');
  });

  it('restores what it saved and leaves other keys alone', () => {
    localStorage.setItem('quran-fives-app-state-v1', JSON.stringify({ currentIndex: 7 }));
    const backup = JSON.parse(JSON.stringify(buildBackup()));
    localStorage.setItem('quran-fives-app-state-v1', JSON.stringify({ currentIndex: 1 }));
    localStorage.setItem('quran-fives-khitma-creds-v1', 'keep');
    applyBackup(backup);
    expect(JSON.parse(localStorage.getItem('quran-fives-app-state-v1'))).toEqual({ currentIndex: 7 });
    expect(localStorage.getItem('quran-fives-khitma-creds-v1')).toBe('keep');
    expect(BACKUP_KEYS).toContain('quran-fives-hifz-trial-v1');
    expect(BACKUP_KEYS).toContain('quran-fives-hifz-reminder-daily-v1');
  });

  it('refuses a file that is not a Khumassiyat backup', () => {
    expect(() => applyBackup({ data: {} })).toThrow();
    expect(() => applyBackup(null)).toThrow();
  });

  it('daily backup never opens Google: with no valid key it does nothing', async () => {
    localStorage.setItem(APP_KEY, JSON.stringify(counterAt(13)));
    expect(await dailyBackupIfDue()).toBeNull();
  });

  describe('restore, while the app is still running with its old state', () => {
    // ما يفعله App: أيّ LOCAL_SYNC_EVENT يعيد حفظ حالته التي في الذاكرة
    const appStillRunningWith = (state) => window.addEventListener('quran-fives-local-sync', () => {
      localStorage.setItem(APP_KEY, JSON.stringify(state));
    });
    const driveHolds = (state, extra = {}) => Object.assign(drive, {
      token: 't',
      file: { id: 'f' },
      content: JSON.stringify({ app: 'khumassiyat', data: { [APP_KEY]: state, 'quran-fives-playback-rate-v1': 1.5, ...extra } }),
    });

    it('keeps the restored counter when the backup also holds a synced key', async () => {
      appStillRunningWith(counterAt(0));
      driveHolds(counterAt(13));
      expect(await restoreBackup()).toBe(true);
      expect(appState().nightCounters[0].value).toBe(13);
      expect(JSON.parse(localStorage.getItem('quran-fives-playback-rate-v1'))).toBe(1.5);
    });

    it('keeps the restored counter when the app saves during a long file download', async () => {
      driveHolds(counterAt(13));
      drive.duringFiles = () => localStorage.setItem(APP_KEY, JSON.stringify(counterAt(0)));
      await restoreBackup();
      expect(appState().nightCounters[0].value).toBe(13);
    });
  });

  describe('reading the backup for the summary', () => {
    it('does not open Google unless asked, and says so', async () => {
      expect(await readRemoteBackup()).toEqual({ status: 'locked' });
    });

    it('reports when Drive holds no backup', async () => {
      drive.token = 't';
      expect(await readRemoteBackup()).toEqual({ status: 'none' });
    });

    it('returns the backup with its Drive date', async () => {
      Object.assign(drive, { token: 't', file: { id: 'f', modifiedTime: '2026-11-01T10:00:00Z' }, content: JSON.stringify({ app: 'khumassiyat', data: {} }) });
      const { backup, savedAt } = await readRemoteBackup();
      expect(backup.app).toBe('khumassiyat');
      expect(savedAt).toBe(Date.parse('2026-11-01T10:00:00Z'));
    });

    it('linking saves nothing, so it can not overwrite a good backup', async () => {
      drive.token = 't';
      await linkGoogle();
      expect(drive.saved).toEqual([]);
    });
  });

  describe('sign-out forgets the Google link', () => {
    it('unlinks and clears the last-backup time', async () => {
      drive.email = 'a@example.com';
      localStorage.setItem('quran-fives-google-backup-last-v1', '123');
      await forgetGoogleLink();
      expect(drive.unlinked).toBe(true);
      expect(lastBackupAt()).toBe(0);
    });

    it('does not touch Google when nothing is linked', async () => {
      await forgetGoogleLink();
      expect(drive.unlinked).toBe(false);
    });

    it('does not wait forever for Google when offline', async () => {
      vi.useFakeTimers();
      drive.email = 'a@example.com';
      drive.unlinkResult = new Promise(() => {});
      const done = forgetGoogleLink();
      await vi.advanceTimersByTimeAsync(3000);
      await expect(done).resolves.toBeUndefined();
      vi.useRealTimers();
    });
  });

  describe('daily backup after sign-out', () => {
    it('does not replace the Drive backup with an empty device', async () => {
      drive.token = 't';
      localStorage.setItem(APP_KEY, JSON.stringify(counterAt(0)));
      expect(await dailyBackupIfDue()).toBeNull();
      expect(drive.saved).toEqual([]);
    });

    it('still backs up a device that holds content', async () => {
      drive.token = 't';
      localStorage.setItem(APP_KEY, JSON.stringify(counterAt(13)));
      expect(await dailyBackupIfDue()).toMatchObject({ failed: 0 });
      expect(JSON.parse(drive.saved[0]).data[APP_KEY].nightCounters[0].value).toBe(13);
    });
  });
});
