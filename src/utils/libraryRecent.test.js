import { describe, it, expect, beforeEach } from 'vitest';
import { readRecent, rememberSearch, LIBRARY_RECENT_KEY } from './libraryRecent';
import { SESSION_STORAGE_KEYS } from './deviceData';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};

describe('libraryRecent', () => {
  beforeEach(() => localStorage.clear());
  it('keeps the newest first, without duplicates, at most 6', () => {
    ['أ', 'ب', 'ج', 'د', 'ه', 'و', 'ز'].forEach(rememberSearch);
    rememberSearch('ه');
    expect(readRecent()).toEqual(['ه', 'ز', 'و', 'د', 'ج', 'ب']);
  });
  it('ignores empty text and broken storage', () => {
    localStorage.setItem(LIBRARY_RECENT_KEY, '{oops');
    expect(rememberSearch('  ')).toEqual([]);
  });
  it('is wiped on sign-out', () => {
    expect(SESSION_STORAGE_KEYS).toContain(LIBRARY_RECENT_KEY);
  });
});
