import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sync: true, google: true, push: null, info: null, backup: null, foreign: false,
}));
vi.mock('./syncConfig', () => ({ get SYNC_ENABLED() { return mocks.sync; } }));
vi.mock('./googleDrive', () => ({ get GOOGLE_ENABLED() { return mocks.google; } }));
vi.mock('./cloudSync', () => ({ pushLocal: (...a) => mocks.push(...a), fetchRemoteInfo: () => mocks.info() }));
vi.mock('./syncMeta', () => ({ deviceDataIsForeign: () => mocks.foreign, clearSyncMeta: () => {} }));
vi.mock('./syncAccount', () => ({ saveAccountStatus: () => {} }));
vi.mock('./googleBackup', () => ({ backupNow: (...a) => mocks.backup(...a) }));

const { saveBeforeSignOut, linkDriveAndSave, destinationName } = await import('./signOutSave');

const content = { nightCounters: [{ id: 'c', value: 13 }] };
const http = (status) => Object.assign(new Error('http'), { status });
const approved = { approved: true, googleBackup: true };
const driveOnly = { approved: false, googleBackup: true };
const save = (over = {}) => saveBeforeSignOut({
  snapshot: content, status: approved, isServerReady: () => true, isPushBusy: () => false, ...over,
});

beforeEach(() => {
  Object.assign(mocks, {
    sync: true, google: true, foreign: false,
    push: vi.fn(async () => {}),
    info: vi.fn(async () => ({ hasState: true, inSync: true, updatedAt: 5 })),
    backup: vi.fn(async () => ({ savedAt: 1, failed: 0 })),
  });
  vi.stubGlobal('navigator', { onLine: true });
});

describe('saveBeforeSignOut', () => {
  it('has nothing to save on an empty device', async () => {
    expect(await save({ snapshot: { nightCounters: [{ value: 0 }] } })).toEqual({ ok: true });
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('saves to the server and does not need Drive', async () => {
    expect(await save()).toEqual({ ok: true });
    expect(mocks.push).toHaveBeenCalledWith(content);
    expect(mocks.backup).not.toHaveBeenCalled();
  });

  it('a Drive-only account saves to Drive without touching the server', async () => {
    expect(await save({ status: driveOnly, isServerReady: () => false })).toEqual({ ok: true });
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.backup).toHaveBeenCalledWith({ interactive: false });
  });

  it('falls back to Drive when the server is down', async () => {
    mocks.push = vi.fn(async () => { throw http(500); });
    expect(await save()).toEqual({ ok: true });
  });

  it('fails on offline before trying anything', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(await save()).toEqual({ ok: false, failure: { kind: 'offline' } });
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('a 409 asks the user and is not hidden by a Drive backup', async () => {
    mocks.push = vi.fn(async () => { throw http(409); });
    expect(await save()).toEqual({ ok: false, failure: { kind: 'conflict', cloudAt: 5 } });
    expect(mocks.backup).not.toHaveBeenCalled();
  });

  it('a 401 is reported as expired', async () => {
    mocks.push = vi.fn(async () => { throw http(401); });
    expect(await save()).toEqual({ ok: false, failure: { kind: 'expired' } });
  });

  it('never pushes on an unverified base when the cloud differs', async () => {
    mocks.info = vi.fn(async () => ({ hasState: true, inSync: false, updatedAt: 9 }));
    expect(await save({ isServerReady: () => false })).toEqual({ ok: false, failure: { kind: 'conflict', cloudAt: 9 } });
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('never uploads another account\'s data into an empty cloud', async () => {
    mocks.foreign = true;
    mocks.info = vi.fn(async () => ({ hasState: false, inSync: false, updatedAt: 0 }));
    mocks.backup = vi.fn(async () => null);
    expect(await save({ isServerReady: () => false })).toEqual({ ok: false, failure: { kind: 'noDestination' } });
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('reports no destination when Drive is not linked', async () => {
    mocks.backup = vi.fn(async () => null);
    expect(await save({ status: driveOnly })).toEqual({ ok: false, failure: { kind: 'noDestination' } });
  });

  it('a Google 401 is not mistaken for an expired app session', async () => {
    mocks.backup = vi.fn(async () => { throw http(401); });
    expect(await save({ status: driveOnly })).toEqual({ ok: false, failure: { kind: 'unreachable' } });
  });

  it('with no permission for Drive it never calls Drive', async () => {
    expect(await save({ status: { approved: false, googleBackup: false } })).toEqual({ ok: false, failure: { kind: 'noDestination' } });
    expect(mocks.backup).not.toHaveBeenCalled();
  });
});

describe('linkDriveAndSave', () => {
  it('opens the Google window on request', async () => {
    expect(await linkDriveAndSave()).toEqual({ ok: true });
    expect(mocks.backup).toHaveBeenCalledWith({ interactive: true });
  });

  it('a closed Google window deletes nothing', async () => {
    mocks.backup = vi.fn(async () => { throw new Error('closed'); });
    expect((await linkDriveAndSave()).ok).toBe(false);
  });
});

describe('destinationName', () => {
  it('names where the data goes', () => {
    expect(destinationName(approved)).toBe('حسابك');
    expect(destinationName(driveOnly)).toBe('جوجل درايف');
    expect(destinationName({ approved: false, googleBackup: false })).toBe('');
  });
});
