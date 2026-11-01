import { describe, it, expect, beforeEach } from 'vitest';
import { SECTION, sectionFor, loadSectionChoice, saveSectionChoice, clearSectionChoice } from './appSection';

const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  },
  dispatchEvent: () => {},
};

describe('app section choice', () => {
  beforeEach(() => store.clear());

  it('asks when nothing is stored', () => {
    expect(sectionFor(loadSectionChoice(), 'a@e.com')).toBeNull();
  });

  it('remembers the choice for its account', () => {
    saveSectionChoice('a@e.com', SECTION.HIFZ);
    expect(sectionFor(loadSectionChoice(), 'a@e.com')).toBe(SECTION.HIFZ);
  });

  it('asks again for a different account', () => {
    saveSectionChoice('a@e.com', SECTION.HIFZ);
    expect(sectionFor(loadSectionChoice(), 'b@e.com')).toBeNull();
  });

  it('signed out has no section', () => {
    saveSectionChoice('a@e.com', SECTION.FIVES);
    expect(sectionFor(loadSectionChoice(), null)).toBeNull();
  });

  it('asks again after the choice is cleared', () => {
    saveSectionChoice('a@e.com', SECTION.FIVES);
    clearSectionChoice();
    expect(sectionFor(loadSectionChoice(), 'a@e.com')).toBeNull();
  });

  it('ignores a damaged value', () => {
    expect(sectionFor({ user: 'a@e.com', section: 'other' }, 'a@e.com')).toBeNull();
    expect(sectionFor('x', 'a@e.com')).toBeNull();
  });
});
