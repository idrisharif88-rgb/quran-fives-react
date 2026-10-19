import { describe, it, expect } from 'vitest';
import { maxScaleFor, scaleSteps } from './appScale';

describe('maxScaleFor', () => {
  it('يسمح بالتكبير حسب عرض الجهاز', () => {
    expect(maxScaleFor(360)).toBe(100);
    expect(maxScaleFor(412)).toBe(115);   // Note 9
    expect(maxScaleFor(430)).toBe(120);
    expect(maxScaleFor(600)).toBe(165);
    expect(maxScaleFor(800)).toBe(170);   // Tab S6
  });

  it('لا يقلّ عن 100 على الشاشات الصغيرة', () => {
    expect(maxScaleFor(320)).toBe(100);
  });
});

describe('scaleSteps', () => {
  it('تنتهي الدرجات عند سقف الجهاز', () => {
    expect(scaleSteps(412).at(-1)).toBe(115);
    expect(scaleSteps(800).at(-1)).toBe(170);
    expect(scaleSteps(412)[0]).toBe(80);
  });
});
