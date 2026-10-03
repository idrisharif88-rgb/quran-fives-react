import { describe, it, expect } from 'vitest';
import { encodeQrPayload, decodeQrPayload } from './qrPayload';

describe('qrPayload', () => {
  it('round-trips position, step and stars', () => {
    const state = {
      stepSize: 7,
      currentIndex: 840,
      currentPageIndex: 603,
      starredIndices: new Set([900, 3, 17, 18]),
      starredPages: new Set([0, 603]),
      starredPageEnds: new Set(),
    };
    expect(decodeQrPayload(encodeQrPayload(state))).toEqual({
      st: 7, c: 840, p: 603, s: [3, 17, 18, 900], sp: [0, 603], spe: [],
    });
  });

  it('stays short with many stars', () => {
    const starredIndices = new Set(Array.from({ length: 100 }, (_, i) => i * 12));
    const text = encodeQrPayload({ stepSize: 5, currentIndex: 1201, currentPageIndex: 0, starredIndices });
    expect(text.length).toBeLessThan(230);
  });

  it('survives an empty state', () => {
    expect(decodeQrPayload(encodeQrPayload(undefined))).toEqual({ st: 5, c: 0, p: 0, s: [], sp: [], spe: [] });
  });

  it('still reads the old base64 JSON codes', () => {
    const old = btoa(JSON.stringify({ v: 1, c: 12, st: 5, s: [1, 2] }));
    expect(decodeQrPayload(old)).toMatchObject({ v: 1, c: 12, s: [1, 2] });
  });

  it('rejects foreign and damaged codes', () => {
    expect(decodeQrPayload('https://example.com')).toBeNull();
    expect(decodeQrPayload('QF2|5|0|0')).toBeNull();
    expect(decodeQrPayload('QF2|5|-|0|||')).toBeNull();
  });
});
