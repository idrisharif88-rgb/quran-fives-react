import { describe, it, expect } from 'vitest';
import { sanitizeNotes, noteKey } from './verseNotesFile';

describe('verseNotesFile', () => {
  it('keys a verse by surah:ayah', () => {
    expect(noteKey({ s: 2, a: 255, t: '' })).toBe('2:255');
  });

  it('keeps valid notes and normalises keys', () => {
    expect(sanitizeNotes({ '2:255': '  آية الكرسي ', '002:001': 'x' })).toEqual({ '2:255': 'آية الكرسي', '2:1': 'x' });
  });

  it('drops bad keys, empty text and non-strings', () => {
    expect(sanitizeNotes({ '115:1': 'x', '0:1': 'x', '2:0': 'x', abc: 'x', '3:4': '   ', '3:5': 7 })).toEqual({});
  });

  it('returns an empty object for non-objects', () => {
    expect(sanitizeNotes(null)).toEqual({});
    expect(sanitizeNotes(['a'])).toEqual({});
    expect(sanitizeNotes('text')).toEqual({});
  });
});
