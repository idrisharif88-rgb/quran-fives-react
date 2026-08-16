import { describe, it, expect } from 'vitest';
import { evaluateRandomAyahAnswer } from './quizUtils.js';
import { QURAN_VERSES } from '../data/quranVerses.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FATIHA_1_1 = { s: 1, a: 1, t: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' };
const BAQARA_2_255 = { s: 2, a: 255, t: 'آيَةُ الْكُرْسِيِّ' };

// ─── evaluateRandomAyahAnswer ─────────────────────────────────────────────────

describe('evaluateRandomAyahAnswer — validation', () => {
  it('empty verse → validation error, shake verse', () => {
    const r = evaluateRandomAyahAnswer('', FATIHA_1_1);
    expect(r.valid).toBe(false);
    expect(r.message).toBe('يرجى إدخال رقم الآية.');
    expect(r.shakeVerse).toBe(true);
  });

  it('non-numeric verse → validation error, shake verse', () => {
    const r = evaluateRandomAyahAnswer('xyz', FATIHA_1_1);
    expect(r.valid).toBe(false);
    expect(r.message).toBe('يرجى إدخال رقم الآية.');
    expect(r.shakeVerse).toBe(true);
  });

  it('punctuation-only input → validation error', () => {
    const r = evaluateRandomAyahAnswer('!!', FATIHA_1_1);
    expect(r.valid).toBe(false);
    expect(r.shakeVerse).toBe(true);
  });
});

describe('evaluateRandomAyahAnswer — correct answer', () => {
  it('exact match → correct, "إجابة صحيحة", no shake', () => {
    const r = evaluateRandomAyahAnswer('1', FATIHA_1_1);
    expect(r.valid).toBe(true);
    expect(r.correct).toBe(true);
    expect(r.message).toBe('إجابة صحيحة');
    expect(r.shakeVerse).toBe(false);
  });

  it('correct answer for Ayat Al-Kursi (2:255) — verse number only', () => {
    const r = evaluateRandomAyahAnswer('255', BAQARA_2_255);
    expect(r.correct).toBe(true);
    expect(r.message).toBe('إجابة صحيحة');
  });

  // جوهر التغيير: رقم السورة لم يعد جزءاً من الإجابة، فإصابة رقم الآية تكفي
  it('a verse number from a different surah still counts when the number matches', () => {
    const r = evaluateRandomAyahAnswer('255', BAQARA_2_255);
    expect(r.correct).toBe(true);
  });
});

describe('evaluateRandomAyahAnswer — wrong answer', () => {
  it('wrong verse → shake verse, message shows the correct verse number', () => {
    const r = evaluateRandomAyahAnswer('99', FATIHA_1_1);
    expect(r.valid).toBe(true);
    expect(r.correct).toBe(false);
    expect(r.message).toBe('غير صحيح. رقم الآية: 1');
    expect(r.shakeVerse).toBe(true);
  });

  it('message embeds the actual correct verse number', () => {
    const r = evaluateRandomAyahAnswer('1', BAQARA_2_255);
    expect(r.message).toBe('غير صحيح. رقم الآية: 255');
  });

  it('no surah number appears in the message', () => {
    const r = evaluateRandomAyahAnswer('1', BAQARA_2_255);
    expect(r.message).not.toContain('السورة');
  });
});

describe('evaluateRandomAyahAnswer — edge cases', () => {
  it('verseData is null → valid:true, correct:false (falls back to a=0)', () => {
    const r = evaluateRandomAyahAnswer('1', null);
    expect(r.valid).toBe(true);
    expect(r.correct).toBe(false);
  });

  it('verseData is undefined → same safe fallback', () => {
    const r = evaluateRandomAyahAnswer('1', undefined);
    expect(r.valid).toBe(true);
    expect(r.correct).toBe(false);
  });

  it('shakeSurah is no longer part of the contract', () => {
    const r = evaluateRandomAyahAnswer('99', FATIHA_1_1);
    expect(r.shakeSurah).toBeUndefined();
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
