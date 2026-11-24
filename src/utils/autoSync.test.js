import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};
globalThis.window = globalThis;
globalThis.window.dispatchEvent = () => true;

vi.mock('./syncAccount', () => ({
  readAccount: () => ({ user: 'me@x.com' }),
  validateEmail: () => null,
  authHeaders: () => ({}),
}));

const server = { state: null, updatedAt: 0, puts: [] };
vi.mock('./cloudSync', async () => {
  const { setSyncMeta, setSyncBase } = await import('./syncMeta');
  return {
    fetchRemoteState: async () => ({ state: server.state, updatedAt: server.updatedAt }),
    putState: async (state, base) => {
      if (base !== server.updatedAt) { const e = new Error('409'); e.status = 409; throw e; }
      server.state = state; server.updatedAt += 1; server.puts.push(state);
      setSyncMeta({ updatedAt: server.updatedAt }); setSyncBase(state);
      return server.updatedAt;
    },
  };
});

const { reconcile } = await import('./autoSync');
const { setSyncMeta, setSyncBase, noteLocalEdit } = await import('./syncMeta');
const { APP_STORAGE_KEY } = await import('./persistence');

const content = (extra = {}) => ({ currentIndex: 7, verseNotes: {}, ...extra });
const stored = () => JSON.parse(localStorage.getItem(APP_STORAGE_KEY));

beforeEach(() => {
  localStorage.clear();
  Object.assign(server, { state: null, updatedAt: 0, puts: [] });
});

describe('reconcile', () => {
  it('an empty device never uploads', async () => {
    expect(await reconcile({ currentIndex: 0, fontSize: 30 })).toBe('none');
    expect(server.puts).toHaveLength(0);
  });

  it('an empty device downloads the cloud copy', async () => {
    Object.assign(server, { state: content(), updatedAt: 5 });
    expect(await reconcile({ currentIndex: 0 })).toBe('reload');
    expect(stored()).toEqual(content());
    expect(server.puts).toHaveLength(0);
  });

  it('uploads local changes when the cloud has none', async () => {
    Object.assign(server, { state: content(), updatedAt: 5 });
    setSyncMeta({ updatedAt: 5 }); setSyncBase(content());
    expect(await reconcile(content({ currentIndex: 9 }))).toBe('pushed');
    expect(server.state.currentIndex).toBe(9);
  });

  it('takes the cloud copy when this device changed nothing', async () => {
    setSyncMeta({ updatedAt: 5 }); setSyncBase(content());
    Object.assign(server, { state: content({ currentIndex: 20 }), updatedAt: 6 });
    expect(await reconcile(content())).toBe('reload');
    expect(stored().currentIndex).toBe(20);
  });

  it('merges when both changed, without asking', async () => {
    setSyncMeta({ updatedAt: 5 }); setSyncBase(content());
    Object.assign(server, { state: content({ verseNotes: { '1:1': 'tablet' } }), updatedAt: 6 });
    noteLocalEdit(1);   // أقدم من طابع الخادم
    expect(await reconcile(content({ verseNotes: { '2:2': 'phone' } }))).toBe('reload');
    expect(server.state.verseNotes).toEqual({ '1:1': 'tablet', '2:2': 'phone' });
    expect(stored().verseNotes).toEqual({ '1:1': 'tablet', '2:2': 'phone' });
  });

  it('keeps nothing in sync when nothing changed', async () => {
    Object.assign(server, { state: content(), updatedAt: 5 });
    setSyncMeta({ updatedAt: 5 }); setSyncBase(content());
    expect(await reconcile(content())).toBe('none');
    expect(server.puts).toHaveLength(0);
  });
});
