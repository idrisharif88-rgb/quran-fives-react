import { describe, it, expect } from 'vitest';
import { normalizeArabic, searchQuran, findMatchRanges } from './quranSearch.js';

// ─── normalizeArabic ───────────────────────────────────────────────────────────

describe('normalizeArabic', () => {
  it('strips tashkeel', () => {
    expect(normalizeArabic('الرَّحْمَٰنِ')).toBe('الرحمن');
  });

  it('unifies alef variants', () => {
    expect(normalizeArabic('آل إبراهيم')).toBe('ال ابراهيم');
  });

  it('unifies ya maqsura and ta marbuta', () => {
    expect(normalizeArabic('موسى والمصلّى والجنة')).toBe('موسي والمصلي والجنه');
  });

  it('removes tatweel and collapses whitespace', () => {
    // التاء المربوطة تُحوَّل إلى هاء ضمن التوحيد، فتُطابق التوقّعَ كذلك
    expect(normalizeArabic('كـلـمة   واحدة')).toBe('كلمه واحده');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeArabic('')).toBe('');
    expect(normalizeArabic(null)).toBe('');
  });
});

// ─── searchQuran ───────────────────────────────────────────────────────────────

describe('searchQuran', () => {
  it('finds a verse by a bare (unvocalised) word', () => {
    const results = searchQuran('العالمين');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({ s: 1, a: 2, surahName: 'الفاتحة' });
  });

  it('finds a word even when typed with tashkeel', () => {
    const results = searchQuran('الرَّحْمَٰنِ');
    expect(results.length).toBeGreaterThan(0);
  });

  it('matches part of a verse', () => {
    const results = searchQuran('مالك يوم الدين');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({ s: 1, a: 4 });
  });

  it('returns an empty array for a blank query', () => {
    expect(searchQuran('')).toEqual([]);
    expect(searchQuran('   ')).toEqual([]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(searchQuran('كلمة غير موجودة إطلاقاً')).toEqual([]);
  });

  it('respects the result limit', () => {
    // «ال» شائعة جداً، فلتُضبط النتيجة عند الحدّ المطلوب
    const results = searchQuran('ال', { limit: 5 });
    expect(results.length).toBe(5);
  });
});

// ─── findMatchRanges ───────────────────────────────────────────────────────────

describe('findMatchRanges', () => {
  it('maps a bare word back to its vocalised text', () => {
    const text = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ';
    const ranges = findMatchRanges(text, 'العالمين');
    expect(ranges.length).toBe(1);
    expect(text.slice(ranges[0].start, ranges[0].end)).toBe('الْعَالَمِينَ');
  });

  it('handles superscript alef and shadda', () => {
    const text = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
    const ranges = findMatchRanges(text, 'الرحمن');
    expect(ranges.length).toBe(1);
    expect(text.slice(ranges[0].start, ranges[0].end)).toBe('الرَّحْمَٰنِ');
  });

  it('finds every occurrence', () => {
    const text = 'قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ';
    const ranges = findMatchRanges(text, 'الله');
    expect(ranges.length).toBe(2);
    expect(text.slice(ranges[0].start, ranges[0].end)).toBe('اللَّهُ');
    expect(text.slice(ranges[1].start, ranges[1].end)).toBe('اللَّهُ');
  });

  it('returns empty when there is no match', () => {
    expect(findMatchRanges('الْحَمْدُ لِلَّهِ', 'الرحمن')).toEqual([]);
    expect(findMatchRanges('نصّ', '')).toEqual([]);
  });
});
