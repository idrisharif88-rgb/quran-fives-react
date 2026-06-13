import { describe, it, expect } from 'vitest';
import { evaluateRandomAyahAnswer } from './quizUtils.js';
import { QURAN_VERSES } from '../data/quranVerses.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FATIHA_1_1 = { s: 1, a: 1, t: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' };
const BAQARA_2_255 = { s: 2, a: 255, t: 'آيَةُ الْكُرْسِيِّ' };

// ─── evaluateRandomAyahAnswer ─────────────────────────────────────────────────

describe('evaluateRandomAyahAnswer — validation', () => {
  it('both fields empty → validation error, shake both', () => {
    const r = evaluateRandomAyahAnswer('', '', FATIHA_1_1);
    expect(r.valid).toBe(false);
    expect(r.message).toBe('يرجى إدخال رقم السورة ورقم الآية.');
    expect(r.shakeSurah).toBe(true);
    expect(r.shakeVerse).toBe(true);
  });

  it('surah empty, verse filled → shake surah only', () => {
    const r = evaluateRandomAyahAnswer('', '1', FATIHA_1_1);
    expect(r.valid).toBe(false);
    expect(r.shakeSurah).toBe(true);
    expect(r.shakeVerse).toBe(false);
  });

  it('surah filled, verse empty → shake verse only', () => {
    const r = evaluateRandomAyahAnswer('1', '', FATIHA_1_1);
    expect(r.valid).toBe(false);
    expect(r.shakeSurah).toBe(false);
    expect(r.shakeVerse).toBe(true);
  });

  it('non-numeric surah → validation error, shake surah', () => {
    const r = evaluateRandomAyahAnswer('abc', '1', FATIHA_1_1);
    expect(r.valid).toBe(false);
    expect(r.shakeSurah).toBe(true);
    expect(r.shakeVerse).toBe(false);
  });

  it('non-numeric verse → validation error, shake verse', () => {
    const r = evaluateRandomAyahAnswer('1', 'xyz', FATIHA_1_1);
    expect(r.valid).toBe(false);
    expect(r.shakeSurah).toBe(false);
    expect(r.shakeVerse).toBe(true);
  });

  it('both non-numeric → validation error, shake both', () => {
    const r = evaluateRandomAyahAnswer('??', '!!', FATIHA_1_1);
    expect(r.valid).toBe(false);
    expect(r.shakeSurah).toBe(true);
    expect(r.shakeVerse).toBe(true);
  });
});

describe('evaluateRandomAyahAnswer — correct answer', () => {
  it('exact match → correct, "إجابة صحيحة", no shakes', () => {
    const r = evaluateRandomAyahAnswer('1', '1', FATIHA_1_1);
    expect(r.valid).toBe(true);
    expect(r.correct).toBe(true);
    expect(r.message).toBe('إجابة صحيحة');
    expect(r.shakeSurah).toBe(false);
    expect(r.shakeVerse).toBe(false);
  });

  it('correct answer for Ayat Al-Kursi (2:255)', () => {
    const r = evaluateRandomAyahAnswer('2', '255', BAQARA_2_255);
    expect(r.correct).toBe(true);
    expect(r.message).toBe('إجابة صحيحة');
  });
});

describe('evaluateRandomAyahAnswer — wrong answer', () => {
  it('wrong surah, correct verse → shake surah only, message shows correct values', () => {
    const r = evaluateRandomAyahAnswer('99', '1', FATIHA_1_1);
    expect(r.valid).toBe(true);
    expect(r.correct).toBe(false);
    expect(r.message).toBe('غير صحيح. السورة: 1 | الآية: 1');
    expect(r.shakeSurah).toBe(true);
    expect(r.shakeVerse).toBe(false);
  });

  it('correct surah, wrong verse → shake verse only, message shows correct values', () => {
    const r = evaluateRandomAyahAnswer('1', '99', FATIHA_1_1);
    expect(r.valid).toBe(true);
    expect(r.correct).toBe(false);
    expect(r.message).toBe('غير صحيح. السورة: 1 | الآية: 1');
    expect(r.shakeSurah).toBe(false);
    expect(r.shakeVerse).toBe(true);
  });

  it('both wrong → shake both, message shows correct values', () => {
    const r = evaluateRandomAyahAnswer('5', '10', FATIHA_1_1);
    expect(r.correct).toBe(false);
    expect(r.message).toBe('غير صحيح. السورة: 1 | الآية: 1');
    expect(r.shakeSurah).toBe(true);
    expect(r.shakeVerse).toBe(true);
  });

  it('message always embeds the actual correct surah and verse', () => {
    const r = evaluateRandomAyahAnswer('1', '1', BAQARA_2_255);
    expect(r.message).toBe('غير صحيح. السورة: 2 | الآية: 255');
  });
});

describe('evaluateRandomAyahAnswer — edge cases', () => {
  it('verseData is null → valid:true, correct:false (treats s=0, a=0 as correct)', () => {
    const r = evaluateRandomAyahAnswer('1', '1', null);
    expect(r.valid).toBe(true);
    expect(r.correct).toBe(false);
  });

  it('verseData is undefined → same safe fallback', () => {
    const r = evaluateRandomAyahAnswer('1', '1', undefined);
    expect(r.valid).toBe(true);
    expect(r.correct).toBe(false);
  });
});

// ─── QURAN_VERSES data integrity ──────────────────────────────────────────────

describe('QURAN_VERSES — data integrity', () => {
  it('total verse count is 6236', () => {
    expect(QURAN_VERSES.length).toBe(6236);
  });

  it('first verse is Al-Fatiha 1:1', () => {
    expect(QURAN_VERSES[0].s).toBe(1);
    expect(QURAN_VERSES[0].a).toBe(1);
  });

  it('last verse is An-Nas 114:6', () => {
    const last = QURAN_VERSES[QURAN_VERSES.length - 1];
    expect(last.s).toBe(114);
    expect(last.a).toBe(6);
  });

  it('index 6 is the last verse of Al-Fatiha (1:7)', () => {
    expect(QURAN_VERSES[6].s).toBe(1);
    expect(QURAN_VERSES[6].a).toBe(7);
  });

  it('index 7 is the first verse of Al-Baqara (2:1) — surah transition', () => {
    expect(QURAN_VERSES[7].s).toBe(2);
    expect(QURAN_VERSES[7].a).toBe(1);
  });

  it('all surah numbers are within 1–114', () => {
    const bad = QURAN_VERSES.filter(v => v.s < 1 || v.s > 114);
    expect(bad).toHaveLength(0);
  });

  it('all ayah numbers are >= 1', () => {
    const bad = QURAN_VERSES.filter(v => v.a < 1);
    expect(bad).toHaveLength(0);
  });

  it('surah numbers are non-decreasing (no out-of-order surahs)', () => {
    for (let i = 1; i < QURAN_VERSES.length; i++) {
      expect(QURAN_VERSES[i].s).toBeGreaterThanOrEqual(QURAN_VERSES[i - 1].s);
    }
  });

  it('each surah starts at ayah 1 and verse numbers increment by 1', () => {
    let prevSurah = 0;
    let prevAyah = 0;
    for (const v of QURAN_VERSES) {
      if (v.s !== prevSurah) {
        expect(v.a).toBe(1);
        prevSurah = v.s;
      } else {
        expect(v.a).toBe(prevAyah + 1);
      }
      prevAyah = v.a;
    }
  });

  it('every verse has a non-empty text field', () => {
    const bad = QURAN_VERSES.filter(v => !v.t || v.t.trim() === '');
    expect(bad).toHaveLength(0);
  });

  it('every verse object has exactly the keys s, a, t', () => {
    const bad = QURAN_VERSES.filter(v => {
      const keys = Object.keys(v).sort().join(',');
      return keys !== 'a,s,t';
    });
    expect(bad).toHaveLength(0);
  });
});
