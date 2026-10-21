import { describe, it, expect } from 'vitest';
import { isUnderAge, birthYears, readAgeGate, saveAgeGate } from './ageGate';

const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
};

describe('ageGate', () => {
  it('يأخذ أصغر عمر ممكن من سنة الميلاد', () => {
    expect(isUnderAge(2013, 2026)).toBe(true);    // 12 أو 13 — قد لا يكون أتمّ 13
    expect(isUnderAge(2012, 2026)).toBe(false);   // 13 على الأقل
    expect(isUnderAge(1990, 2026)).toBe(false);
  });

  it('سنوات الاختيار من هذه السنة إلى مئة سنة مضت', () => {
    const years = birthYears(2026);
    expect(years[0]).toBe(2026);
    expect(years.at(-1)).toBe(1926);
  });

  it('الجواب يُحفظ على الجهاز', () => {
    expect(readAgeGate()).toBe(null);
    saveAgeGate('child');
    expect(readAgeGate()).toBe('child');
  });
});
