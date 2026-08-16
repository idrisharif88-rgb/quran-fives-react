import { describe, it, expect } from 'vitest';
import { SURAH_METADATA } from '../data/quranConstants.js';
import { getSurahAndRange } from './quranLogic.js';
import {
  STEP_SIZES,
  totalGroups,
  firstIndexOfSurah,
  groupCountOfSurah,
  indexForSurahAyah,
  normalizeStep,
} from './stepNavigation.js';

// النسخة التاريخية من getSurahAndRange (خماسيات فقط) — مرجع الانحدار:
// أي اختلاف عنها يعني أنّ تعميم الخطوة كسر سلوك الخماسيات القائم.
function legacyGetSurahAndRange(idx) {
  const verseEnd = (idx + 1) * 5;
  let acc = 0;
  let absoluteAcc = 0;
  for (let i = 0; i < 114; i++) {
    const surah = SURAH_METADATA[i];
    const usable = surah.verseCount - (surah.verseCount % 5);
    if (acc + usable >= verseEnd) {
      const endInSurah = verseEnd - acc;
      return {
        surah: surah.id,
        name: surah.name,
        start: Math.max(1, endInSurah - 4),
        end: endInSurah,
        groupNo: Math.ceil(endInSurah / 5),
        totalGroups: Math.floor(surah.verseCount / 5),
        absoluteStartIndex: absoluteAcc + (Math.max(1, endInSurah - 4) - 1),
        absoluteEndIndex: absoluteAcc + endInSurah,
      };
    }
    acc += usable;
    absoluteAcc += surah.verseCount;
  }
  return { surah: 0, name: 'غير معروف', start: 0, end: 0, groupNo: 0, totalGroups: 0, absoluteStartIndex: 0, absoluteEndIndex: 0 };
}

describe('الخطوة 5 تبقى كما كانت (انحدار)', () => {
  it('العدد الإجمالي 1202 خماسية', () => {
    expect(totalGroups(5)).toBe(1202);
  });

  it('كل الفهارس الـ1202 تطابق النسخة التاريخية، بتمرير الخطوة وبدونه', () => {
    for (let i = 0; i < 1202; i++) {
      const legacy = legacyGetSurahAndRange(i);
      expect(getSurahAndRange(i)).toEqual(legacy);
      expect(getSurahAndRange(i, 5)).toEqual(legacy);
    }
  });

  it('الفهرس خارج المدى يعيد النتيجة الاحتياطية', () => {
    expect(getSurahAndRange(1202).surah).toBe(0);
    expect(getSurahAndRange(-1).surah).toBe(0);
  });
});

describe('مجاميع الخطوات', () => {
  it.each(STEP_SIZES)('الخطوة %i تساوي مجموع floor(عدد الآيات / الخطوة)', (step) => {
    const expected = SURAH_METADATA.reduce((t, s) => t + Math.floor(s.verseCount / step), 0);
    expect(totalGroups(step)).toBe(expected);
  });

  it('الخطوة 1 تغطّي آيات القرآن كلّها (6236)', () => {
    expect(totalGroups(1)).toBe(6236);
  });

  it('الخطوة غير المدعومة ترتدّ إلى 5', () => {
    expect(normalizeStep(4)).toBe(5);
    expect(normalizeStep(undefined)).toBe(5);
    expect(totalGroups(99)).toBe(1202);
  });
});

describe('سلامة المجموعات في كل خطوة', () => {
  it.each(STEP_SIZES)('الخطوة %i: كل مجموعة بطول الخطوة وداخل حدود سورتها', (step) => {
    let prevSurah = 0;
    for (let i = 0; i < totalGroups(step); i++) {
      const g = getSurahAndRange(i, step);
      const meta = SURAH_METADATA[g.surah - 1];
      expect(g.end).toBeLessThanOrEqual(meta.verseCount);
      expect(g.end - g.start + 1).toBe(step);
      expect(g.absoluteEndIndex - g.absoluteStartIndex).toBe(step);
      expect(g.surah).toBeGreaterThanOrEqual(prevSurah); // ترتيب المصحف محفوظ
      prevSurah = g.surah;
    }
  });
});

describe('firstIndexOfSurah', () => {
  it.each(STEP_SIZES)('الخطوة %i: أوّل مجموعة في كل سورة هي المجموعة رقم 1 فيها', (step) => {
    for (let s = 1; s <= 114; s++) {
      const idx = firstIndexOfSurah(s, step);
      if (idx === null) {
        // لا يعيد null إلّا لسورة أقصر من الخطوة (الكوثر عند 7 مثلاً)
        expect(SURAH_METADATA[s - 1].verseCount).toBeLessThan(step);
        expect(groupCountOfSurah(s, step)).toBe(0);
        continue;
      }
      const g = getSurahAndRange(idx, step);
      expect(g.surah).toBe(s);
      expect(g.groupNo).toBe(1);
      expect(g.start).toBe(1);
      expect(g.end).toBe(step);
    }
  });

  it('يرفض أرقام السور خارج 1..114', () => {
    expect(firstIndexOfSurah(0, 5)).toBeNull();
    expect(firstIndexOfSurah(115, 5)).toBeNull();
  });
});

describe('indexForSurahAyah: تبديل الخطوة يحفظ الموضع', () => {
  it.each(STEP_SIZES)('من الخطوة %i إلى كل الخطوات: تبقى السورة نفسها', (from) => {
    for (const to of STEP_SIZES) {
      for (let i = 0; i < totalGroups(from); i += 7) {
        const here = getSurahAndRange(i, from);
        const idx = indexForSurahAyah(here.surah, here.end, to);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(totalGroups(to));
        if (groupCountOfSurah(here.surah, to) > 0) {
          const there = getSurahAndRange(idx, to);
          expect(there.surah).toBe(here.surah);
          // المجموعة الجديدة تغطّي الآية نفسها، أو هي آخر مجموعة في السورة
          expect(there.end >= here.end || there.groupNo === there.totalGroups).toBe(true);
        }
      }
    }
  });

  it('السورة الأقصر من الخطوة تنتقل إلى أقرب سورة تتّسع لها', () => {
    // الكوثر (3 آيات) لا مجموعة لها عند الخطوة 7
    expect(groupCountOfSurah(108, 7)).toBe(0);
    const idx = indexForSurahAyah(108, 3, 7);
    const g = getSurahAndRange(idx, 7);
    expect(g.surah).toBeGreaterThan(0);
    expect(groupCountOfSurah(g.surah, 7)).toBeGreaterThan(0);
  });
});
