import { describe, it, expect, beforeEach, vi } from 'vitest';

const m = vi.hoisted(() => ({ native: false, shared: [] }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => m.native } }));
vi.mock('@capacitor/share', () => ({ Share: { share: async (o) => { m.shared.push(o); throw new Error('cancelled'); } } }));

const { noteShareText, copyText, shareText } = await import('./verseNoteShare');

beforeEach(() => { m.native = false; m.shared = []; });

describe('verse note sharing', () => {
  it('keeps the verse reference with the text', () => {
    expect(noteShareText('البقرة', 2, 'تفسير')).toBe('البقرة 2\nتفسير');
  });

  it('copies through the clipboard', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyText('x')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('x');
  });

  it('a cancelled Android share sheet is not a failure', async () => {
    m.native = true;
    expect(await shareText('x', 't')).toBe(true);
    expect(m.shared).toEqual([{ title: 't', text: 'x' }]);
  });

  it('reports false when the browser has no sharing', async () => {
    vi.stubGlobal('navigator', {});
    expect(await shareText('x', 't')).toBe(false);
  });
});
