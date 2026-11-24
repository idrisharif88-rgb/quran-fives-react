import { describe, it, expect } from 'vitest';
import { groupErrors } from './errorLogView';

describe('groupErrors', () => {
  it('folds the same error into one row, newest first', () => {
    const rows = groupErrors([
      { kind: 'sync', message: 'a', at: 1, installId: 'x', count: 2 },
      { kind: 'sync', message: 'a', at: 5, installId: 'y', user: 'u', version: '1.39' },
      { kind: 'crash', message: 'b', at: 3 },
    ]);
    expect(rows.map((r) => r.message)).toEqual(['a', 'b']);
    expect(rows[0].count).toBe(3);
    expect(rows[0].installs.size).toBe(2);
    expect([...rows[0].users]).toEqual(['u']);
  });
});
