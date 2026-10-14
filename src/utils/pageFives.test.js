import { describe, it, expect } from 'vitest';
import { fivesOnPage } from './pageFives';

const ayahs = (page) => fivesOnPage(page).map((m) => `${m.surah}:${m.ayah}`);

describe('fives marks on a mushaf page', () => {
  it('page 3 (al-Baqarah 6–16) shows 10 and 15', () => {
    expect(ayahs(3)).toEqual(['2:10', '2:15']);
  });
  it('page 4 (al-Baqarah 17–24) shows 20', () => {
    expect(ayahs(4)).toEqual(['2:20']);
  });
  it('page 1 (al-Fatiha) shows 5', () => {
    expect(ayahs(1)).toEqual(['1:5']);
  });
  it('the last page spans three surahs; al-Ikhlas (4 verses) has none', () => {
    expect(ayahs(604)).toEqual(['113:5', '114:5']);
  });
  it('a crowded page (585, Abasa) has all eight', () => {
    expect(ayahs(585)).toEqual([5, 10, 15, 20, 25, 30, 35, 40].map((a) => `80:${a}`));
  });
  it('out-of-range pages have none', () => {
    expect(fivesOnPage(0)).toEqual([]);
    expect(fivesOnPage(605)).toEqual([]);
  });
});
