import { describe, it, expect } from 'vitest';
import { clampPage, surahOfPage, chunkLocation, wordsOfLine, computePageFit, rebalanceLines } from './mushafLayout';

describe('mushafLayout', () => {
  it('clamps pages into the book', () => {
    expect(clampPage(0, 604)).toBe(1);
    expect(clampPage(700, 604)).toBe(604);
    expect(clampPage('12', 604)).toBe(12);
    expect(clampPage('x', 604)).toBe(1);
  });

  it('finds the surah a page belongs to', () => {
    const surahPages = [1, 2, 50, 77];
    expect(surahOfPage(1, surahPages)).toBe(1);
    expect(surahOfPage(2, surahPages)).toBe(2);
    expect(surahOfPage(49, surahPages)).toBe(2);
    expect(surahOfPage(50, surahPages)).toBe(3);
    expect(surahOfPage(600, surahPages)).toBe(4);
  });

  it('locates a page inside the chunk files', () => {
    expect(chunkLocation(1, 50)).toEqual({ chunk: 0, offset: 0 });
    expect(chunkLocation(50, 50)).toEqual({ chunk: 0, offset: 49 });
    expect(chunkLocation(51, 50)).toEqual({ chunk: 1, offset: 0 });
    expect(chunkLocation(604, 50)).toEqual({ chunk: 12, offset: 3 });
  });

  it('splits a line into words that keep their verse', () => {
    expect(wordsOfLine({ k: 't', v: [[2, 1, 'a b'], [2, 2, 'c']] })).toEqual([
      { glyph: 'a', verse: '2:1' },
      { glyph: 'b', verse: '2:1' },
      { glyph: 'c', verse: '2:2' },
    ]);
  });

  const text = (n) => Array(n).fill(true);

  it('fits full lines to the width and justifies them, centring a short last line', () => {
    const fit = computePageFit({
      lineWidths: [...Array(13).fill(2000), 1900, 900], textLines: text(15),
      baseSize: 100, width: 400, height: 2000, fullLineCount: 15,
    });
    expect(fit.fontSize).toBeCloseTo(20);
    expect(fit.contentWidth).toBeCloseTo(400);
    expect(fit.justify.slice(0, 14).every(Boolean)).toBe(true);
    expect(fit.justify[14]).toBe(false);
    expect(fit.squeeze.every((k) => k === 1)).toBe(true);
    expect(fit.lineHeight).toBeCloseTo(46); // capped at 2.3 × font size, not 2000 / 15
  });

  it('limits the font by height on short screens', () => {
    const fit = computePageFit({
      lineWidths: Array(15).fill(2000), textLines: text(15),
      baseSize: 100, width: 800, height: 420, fullLineCount: 15,
    });
    expect(fit.fontSize).toBeCloseTo(16);
    expect(fit.lineHeight).toBeCloseTo(28);
    expect(fit.contentWidth).toBeCloseTo(320); // book-shaped column, not the 800px screen
  });

  it('one over-wide line does not shrink the page; only that line is squeezed', () => {
    const fit = computePageFit({
      lineWidths: [...Array(14).fill(2000), 2400], textLines: text(15),
      baseSize: 100, width: 400, height: 2000, fullLineCount: 15,
    });
    expect(fit.fontSize).toBeCloseTo(20);
    expect(fit.squeeze[14]).toBeCloseTo(2000 / 2400);
    expect(fit.squeeze.slice(0, 14).every((k) => k === 1)).toBe(true);
  });

  it('centres the two opening pages and never justifies a surah title or basmala', () => {
    const opening = computePageFit({
      lineWidths: [null, 1000, 800, 900, 700, 1000, 600, 500], textLines: [false, ...text(7)],
      baseSize: 100, width: 400, height: 2000, fullLineCount: 15,
    });
    expect(opening.justify.every((j) => j === false)).toBe(true);
    expect(opening.fontSize).toBeCloseTo(28.8);

    const withTitle = computePageFit({
      lineWidths: [null, 1990, ...Array(13).fill(2000)], textLines: [false, false, ...text(13)],
      baseSize: 100, width: 400, height: 2000, fullLineCount: 15,
    });
    expect(withTitle.justify.slice(0, 2)).toEqual([false, false]);
  });

  describe('rebalanceLines', () => {
    const line = (...widths) => ({ k: 't', words: widths.map((width, i) => ({ glyph: `w${i}`, verse: '1:1', width })) });
    const widths = (lines) => lines.map((l) => (l.k === 't' ? l.words.reduce((s, w) => s + w.width, 0) : null));
    const full = () => line(500, 500, 500, 500);

    it('moves a misplaced last word down to the short line below', () => {
      const lines = [full(), full(), full(), line(500, 500, 500, 500, 400), line(600, 500, 500), full()];
      const fixed = rebalanceLines(lines);
      expect(widths(fixed)).toEqual([2000, 2000, 2000, 2000, 2000, 2000]);
      expect(fixed[4].words[0].width).toBe(400); // lands first on the next line: order kept
    });

    it('moves a misplaced first word up to the short line above', () => {
      const lines = [full(), full(), full(), line(500, 500, 600), line(400, 500, 500, 500, 500), full()];
      const fixed = rebalanceLines(lines);
      expect(widths(fixed)).toEqual([2000, 2000, 2000, 2000, 2000, 2000]);
    });

    it('picks the neighbour that needs the word, not just the first one tried', () => {
      // السطر الأوسط زائد بكلمة؛ الذي فوقه كامل والذي تحته ناقص ← تنزل الكلمة ولا تصعد
      const lines = [full(), full(), full(), full(), line(100, 500, 500, 500, 400, 400), line(700, 500), full()];
      const fixed = rebalanceLines(lines);
      expect(widths(fixed)).toEqual([2000, 2000, 2000, 2000, 2000, 1600, 2000]);
    });

    it('leaves a correct page untouched, including a short surah ending', () => {
      const lines = [full(), full(), full(), full(), line(500, 400), { k: 's', s: 3 }, { k: 'b' }, full()];
      expect(rebalanceLines(lines)).toEqual(lines);
    });

    it('never moves a word across a surah title', () => {
      const lines = [full(), full(), full(), line(500, 500, 500, 500, 400), { k: 's', s: 3 }, line(600, 500, 500)];
      expect(widths(rebalanceLines(lines))).toEqual([2000, 2000, 2000, 2400, null, 1600]);
    });
  });
});
