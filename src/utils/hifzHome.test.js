import { describe, it, expect } from 'vitest';
import {
  normalizeHome, rollHome, tapZikr, zikrCount, azkarSummary, addZikr, removeZikr,
  tapTasbeeh, zeroTasbeeh, pickTasbeeh, addTasbeeh, removeTasbeeh, activeTasbeeh, tasbeehRounds,
  setTafseerVerse, DEFAULT_AZKAR, DEFAULT_TASBEEH, TARGET_MAX,
} from './hifzHome';

const D1 = '2026-11-12';
const D2 = '2026-11-13';
const times = (n, fn, state) => { let s = state; for (let i = 0; i < n; i++) s = fn(s); return s; };

describe('الحالة الأولى', () => {
  it('لا مخزَّن: القوائم المقترحة', () => {
    const s = normalizeHome(null);
    expect(s.azkar).toEqual(DEFAULT_AZKAR);
    expect(s.tasbeeh).toEqual(DEFAULT_TASBEEH);
    expect(s.tasbeehActive).toBe('t1');
    expect(s.tafseer).toBeNull();
  });

  it('قائمة أفرغها صاحبها تبقى فارغة، والتالف يُسقط', () => {
    const s = normalizeHome({ azkar: [], tasbeeh: [{ id: 'x', text: ' ذكر ', target: 5 }, { id: 'y', text: '', target: 5 }, { id: 'z', text: 'م', target: 0 }], tasbeehActive: 'gone', tasbeehCount: -3, tafseer: { s: 200, a: 1 } });
    expect(s.azkar).toEqual([]);
    expect(s.tasbeeh).toEqual([{ id: 'x', text: 'ذكر', target: 5 }]);
    expect(s.tasbeehActive).toBe('x');
    expect(s.tasbeehCount).toBe(0);
    expect(s.tafseer).toBeNull();
  });
});

describe('أذكاري', () => {
  it('الضغطة تعدّ إلى الهدف، وبعده تعيد إلى صفر', () => {
    let s = times(10, (x) => tapZikr(x, D1, 'a3'), normalizeHome(null));
    expect(zikrCount(s, D1, 'a3')).toBe(10);
    expect(azkarSummary(s, D1)).toEqual({ done: 1, total: 4 });
    s = tapZikr(s, D1, 'a3');
    expect(zikrCount(s, D1, 'a3')).toBe(0);
  });

  it('يوم جديد: العدّ من صفر والقائمة كما هي', () => {
    const s = times(10, (x) => tapZikr(x, D1, 'a3'), normalizeHome(null));
    expect(zikrCount(s, D2, 'a3')).toBe(0);
    expect(azkarSummary(s, D2).done).toBe(0);
    expect(tapZikr(s, D2, 'a3').azkarCounts).toEqual({ a3: 1 });
  });

  it('إضافة وحذف', () => {
    let s = addZikr(normalizeHome(null), 'n1', '  حسبي الله  ', 7);
    expect(s.azkar.at(-1)).toEqual({ id: 'n1', text: 'حسبي الله', target: 7 });
    expect(addZikr(s, 'n2', '   ', 7)).toBe(s);
    expect(addZikr(s, 'n2', 'ذكر', TARGET_MAX + 1)).toBe(s);
    s = removeZikr(tapZikr(s, D1, 'n1'), 'n1');
    expect(s.azkar).toHaveLength(4);
    expect(s.azkarCounts).toEqual({});
  });
});

describe('مسبحتي', () => {
  it('بلوغ الهدف دورة، والضغطة بعده تبدأ من واحد', () => {
    let s = times(33, (x) => tapTasbeeh(x, D1), normalizeHome(null));
    expect(s.tasbeehCount).toBe(33);
    expect(tasbeehRounds(s, D1)).toBe(1);
    s = tapTasbeeh(s, D1);
    expect(s.tasbeehCount).toBe(1);
    expect(tasbeehRounds(s, D1)).toBe(1);
  });

  it('الدورات لليوم وحده، والعدّ الجاري يبقى', () => {
    const s = times(35, (x) => tapTasbeeh(x, D1), normalizeHome(null));
    expect(tasbeehRounds(s, D2)).toBe(0);
    const next = rollHome(s, D2);
    expect(next.tasbeehCount).toBe(2);
    expect(next.tasbeehRounds).toBe(0);
  });

  it('تغيير الذكر يصفّر، والتصفير لا يمسّ الدورات', () => {
    let s = times(33, (x) => tapTasbeeh(x, D1), normalizeHome(null));
    s = pickTasbeeh(s, 't3');
    expect(activeTasbeeh(s).target).toBe(34);
    expect(s.tasbeehCount).toBe(0);
    expect(pickTasbeeh(s, 'none')).toBe(s);
    expect(zeroTasbeeh(tapTasbeeh(s, D1))).toMatchObject({ tasbeehCount: 0, tasbeehRounds: 1 });
  });

  it('ذكر من عنده يصير الجاري، وحذف الجاري يعود إلى الأول', () => {
    let s = addTasbeeh(normalizeHome(null), 'm1', 'لا حول ولا قوة إلا بالله', 100);
    expect(s.tasbeehActive).toBe('m1');
    s = removeTasbeeh(s, 'm1');
    expect(s.tasbeehActive).toBe('t1');
    s = ['t1', 't2', 't3'].reduce(removeTasbeeh, s);
    expect(s.tasbeehActive).toBeNull();
    expect(tapTasbeeh(s, D1).tasbeehCount).toBe(0);
  });
});

describe('آية التفسير', () => {
  it('آية مختارة أو آية اليوم', () => {
    const s = setTafseerVerse(normalizeHome(null), { s: 2, a: 255 });
    expect(s.tafseer).toEqual({ s: 2, a: 255 });
    expect(setTafseerVerse(s, null).tafseer).toBeNull();
  });

  it('تبقى بعد الحفظ والقراءة', () => {
    const saved = JSON.parse(JSON.stringify(setTafseerVerse(tapTasbeeh(normalizeHome(null), D1), { s: 1, a: 5 })));
    expect(normalizeHome(saved)).toMatchObject({ tafseer: { s: 1, a: 5 }, tasbeehCount: 1, tasbeehDay: D1 });
  });
});
