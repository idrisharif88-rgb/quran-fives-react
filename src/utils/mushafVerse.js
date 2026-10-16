import { PAGE_STARTS } from '../data/pageStarts';
import { MUSHAF, loadMushafPage } from './mushafEdition';

// رموز آية واحدة بخطّ مصحف المدينة: كل رمز كلمة، وآخرها رقم الآية.
// الآية قد تمتدّ على صفحتين، فلكل رمز خطّ صفحته.

const startsBefore = (start, s, a) => start.s < s || (start.s === s && start.a <= a);

function pageOfVerse(s, a) {
  let page = 1;
  for (const start of PAGE_STARTS) {
    if (!startsBefore(start, s, a)) break;
    page = start.page;
  }
  return page;
}

function verseSegments(lines, key) {
  return lines
    .filter((l) => l.k === 't')
    .flatMap((l) => l.v)
    .filter(([s, a]) => `${s}:${a}` === key);
}

/** @returns {Promise<{ glyph: string, family: string }[]>} */
export async function loadVerseGlyphs(s, a) {
  const key = `${s}:${a}`;
  const page = pageOfVerse(s, a);
  const pages = [page];
  if (page > 1) pages.unshift(page - 1);
  if (page < MUSHAF.totalPages) pages.push(page + 1);

  const loaded = await Promise.all(pages.map(loadMushafPage));
  return loaded.flatMap(({ lines, family }) =>
    verseSegments(lines, key).flatMap(([, , glyphs]) =>
      glyphs.split(' ').map((glyph) => ({ glyph, family })),
    ),
  );
}
