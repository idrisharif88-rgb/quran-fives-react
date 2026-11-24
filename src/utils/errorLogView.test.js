import { describe, it, expect } from 'vitest';
import { groupErrors, devicesOf, deviceName } from './errorLogView';

const rows = [
  { kind: 'sync', message: 'a', at: 1, installId: 'phone', model: 'samsung SM-N960F', os: 'Android 10', count: 2, user: 'u1' },
  { kind: 'sync', message: 'a', at: 5, installId: 'tab', model: 'samsung SM-T860', os: 'Android 12', user: 'u1', version: '1.39' },
  { kind: 'crash', message: 'b', at: 3, installId: 'phone', model: 'samsung SM-N960F', os: 'Android 10' },
];

describe('errorLogView', () => {
  it('folds one error and lists each device under it', () => {
    const g = groupErrors(rows);
    expect(g.map((r) => r.message)).toEqual(['a', 'b']);
    expect(g[0].count).toBe(3);
    expect(g[0].devices.map((d) => [d.installId, d.count])).toEqual([['tab', 1], ['phone', 2]]);
  });

  it('lists devices with their totals for the filter', () => {
    const d = devicesOf(rows);
    expect(d.map((x) => [x.installId, x.count, x.errors.size])).toEqual([['tab', 1, 1], ['phone', 3, 2]]);
  });

  it('names a device by model, browser or id', () => {
    expect(deviceName({ model: 'samsung SM-N960F', os: 'Android 10' })).toBe('samsung SM-N960F · Android 10');
    expect(deviceName({ installId: 'abcdef1234' })).toBe('جهاز 1234');
    expect(deviceName({ installId: 'p', model: 'x' }, { p: 'هاتفي' })).toBe('هاتفي');
  });
});
