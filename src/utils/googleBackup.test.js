import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
};
globalThis.window = { localStorage: globalThis.localStorage };

vi.mock('./googleBackupFiles', () => ({ filesIndex: () => ({ hifz: [], ijaza: {} }), backupFiles: async () => 0, restoreFiles: async () => {} }));
vi.mock('./googleDrive', () => ({ getAccessToken: async () => null, findFile: async () => null, saveFile: async () => ({}), readFile: async () => '' }));

const { buildBackup, applyBackup, dailyBackupIfDue, BACKUP_KEYS } = await import('./googleBackup');

beforeEach(() => mem.clear());

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
    expect(await dailyBackupIfDue()).toBeNull();
  });
});
