import { describe, it, expect } from 'vitest';
import { encodeWav } from './wavEncode';

describe('WAV encoding for sharing', () => {
  it('writes a valid 16-bit mono PCM header and samples', async () => {
    const blob = encodeWav(new Float32Array([0, 1, -1, 0.5]), 16000);
    const view = new DataView(await blob.arrayBuffer());
    const text = (o, n) => String.fromCharCode(...Array.from({ length: n }, (_, i) => view.getUint8(o + i)));
    expect(blob.type).toBe('audio/wav');
    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 4)).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint32(40, true)).toBe(8);
    expect(view.getInt16(46, true)).toBe(32767);
    expect(view.getInt16(48, true)).toBe(-32768);
  });
});
