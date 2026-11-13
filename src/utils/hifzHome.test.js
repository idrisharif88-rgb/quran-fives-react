import { describe, it, expect } from 'vitest';
import {
  normalizeHome, rollHome, tapTasbeeh, zeroTasbeeh, pickTasbeeh, addTasbeeh, removeTasbeeh, activeTasbeeh, tasbeehRounds,
  setTafseerVerse, setTafseerBook, nextTasbeeh, DEFAULT_TASBEEH,
} from './hifzHome';

const D1 = '2026-11-12';
const D2 = '2026-11-13';
const times = (n, fn, state) => { let s = state; for (let i = 0; i < n; i++) s = fn(s); return s; };

describe('الحالة الأولى', () => {
  it('لا مخزَّن: القوائم المقترحة', () => {
    const s = normalizeHome(null);
    expect(s.tasbeeh).toEqual(DEFAULT_TASBEEH);
    expect(s.tasbeehActive).toBe('t1');
    expect(s.tafseer).toBeNull();
    expect(s.tafseerBook).toBe(15);
  });

  it('قائمة أفرغها صاحبها تبقى فارغة، والتالف يُسقط', () => {
    const s = normalizeHome({ azkar: [{ id: 'old' }], tafseerBook: 999, tasbeeh: [{ id: 'x', text: ' ذكر ', target: 5 }, { id: 'y', text: '', target: 5 }, { id: 'z', text: 'م', target: 0 }], tasbeehActive: 'gone', tasbeehCount: -3, tafseer: { s: 200, a: 1 } });
    expect(s).not.toHaveProperty('azkar');
    expect(s.tafseerBook).toBe(15);
    expect(s.tasbeeh).toEqual([{ id: 'x', text: 'ذكر', target: 5 }]);
    expect(s.tasbeehActive).toBe('x');
    expect(s.tasbeehCount).toBe(0);
    expect(s.tafseer).toBeNull();
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

  it('بعد الإتمام: الذكر التالي من صفر، وبعد الأخير الأول', () => {
    let s = times(33, (x) => tapTasbeeh(x, D1), normalizeHome(null));
    s = nextTasbeeh(s);
    expect(s).toMatchObject({ tasbeehActive: 't2', tasbeehCount: 0, tasbeehRounds: 1 });
    expect(nextTasbeeh(nextTasbeeh(s)).tasbeehActive).toBe('t1');
    const empty = ['t1', 't2', 't3'].reduce(removeTasbeeh, s);
    expect(nextTasbeeh(empty)).toBe(empty);
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

  it('الكتاب: معروف يُحفظ، وغير معروف يُرفض', () => {
    const s = setTafseerBook(normalizeHome(null), 90);
    expect(s.tafseerBook).toBe(90);
    expect(setTafseerBook(s, 999)).toBe(s);
  });

  it('تبقى بعد الحفظ والقراءة', () => {
    const saved = JSON.parse(JSON.stringify(setTafseerBook(setTafseerVerse(tapTasbeeh(normalizeHome(null), D1), { s: 1, a: 5 }), 94)));
    expect(normalizeHome(saved)).toMatchObject({ tafseer: { s: 1, a: 5 }, tafseerBook: 94, tasbeehCount: 1, tasbeehDay: D1 });
  });
});
