import { describe, it, expect } from 'vitest';
import { sanadNumbers, sanitizeIjazat } from './ijazat';

describe('sanad card numbers', () => {
  it('fives are the names at 5, 10, 15… only', () => {
    expect(sanadNumbers(32, 'fives')).toEqual([5, 10, 15, 20, 25, 30]);
    expect(sanadNumbers(30, 'fives')).toEqual([5, 10, 15, 20, 25, 30]);
  });
  it('ones are every name', () => {
    expect(sanadNumbers(4, 'ones')).toEqual([1, 2, 3, 4]);
    expect(sanadNumbers(32, 'ones')).toHaveLength(32);
  });
  it('a sanad shorter than five has no fives', () => {
    expect(sanadNumbers(4, 'fives')).toEqual([]);
  });
});

describe('sanitizeIjazat', () => {
  it('drops broken entries and trims text', () => {
    const out = sanitizeIjazat([
      null,
      { type: 'no id' },
      { id: 'a', type: ' حفص ', mojeez: 'الشيخ', chain: [' 1 ', '2'] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'a', type: 'حفص', chain: ['1', '2'] });
  });
  it('keeps notes of names in the sanad only, and drops empty ones', () => {
    const [ij] = sanitizeIjazat([{ id: 'a', chain: ['1', '2'], notes: { 1: ' وُلد 1200 ', 2: '  ', 9: 'x' } }]);
    expect(ij.notes).toEqual({ 1: 'وُلد 1200' });
  });
  it('anything that is not a list is empty', () => {
    expect(sanitizeIjazat(undefined)).toEqual([]);
    expect(sanitizeIjazat({})).toEqual([]);
  });
});
