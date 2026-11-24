import { describe, it, expect } from 'vitest';
import { uaDevice, summarize } from './securityLogView';

describe('securityLogView', () => {
  it('reads the phone model from the app WebView', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 10; SM-N960F Build/QP1A.190711.020; wv) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
    expect(uaDevice(ua)).toBe('SM-N960F · Android 10');
    expect(uaDevice('curl/8.5.0')).toBe('أداة برمجية: curl');
    expect(uaDevice('Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/120.0 Safari/537.36')).toBe('Chrome · Windows NT 10.0');
  });

  it('counts levels and ranks accounts by alerts', () => {
    const s = summarize([
      { level: 'alert', user: 'a' }, { level: 'warn', user: 'b' }, { level: 'warn', user: 'b' }, { level: 'info', user: 'a' },
    ]);
    expect(s.levels).toEqual({ alert: 1, warn: 2, info: 1 });
    expect(s.users.map((u) => u.user)).toEqual(['a', 'b']);
  });
});
