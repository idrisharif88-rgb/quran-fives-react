import test from 'node:test';
import assert from 'node:assert/strict';
import { openLibrary, addBook } from '../build.js';
import { searchLibrary, snippetAround } from '../search.js';
import { normalizeArabic, toFtsQuery } from '../normalize.js';
import { parseOpenITI } from '../parse.js';

const SAMPLE = `#META# 000.BookURI :: #0001.Test.Book
#META# 020.BookTITLE :: كتاب تجريبي
#META# 011.AuthorDIED :: 100
#META#Header#End#

### | (كتاب الصلاة)
### || (باب فضل الصلاة)
PageV01P005
# قال رسول الله: الصَّلاةُ عمود الدين
~~وهي من أفضل الأعمال [عند] الله
PageV01P006
# أَمَّا الزكاة فهي واجبة ms0002
`;

test('normalize: tashkeel, alef, yaa, taa marbuta', () => {
  assert.equal(normalizeArabic('الصَّلاةُ'), 'الصلاه');
  assert.equal(normalizeArabic('إلى أنْ'), 'الي ان');
});

test('parse: chapters, pages, continuation lines', () => {
  const r = parseOpenITI(SAMPLE);
  assert.deepEqual(r.chapters.map((c) => [c.level, c.title, c.parent]), [[1, 'كتاب الصلاة', null], [2, 'باب فضل الصلاة', 1]]);
  assert.equal(r.pages.length, 2);
  assert.equal(r.passages.length, 2);
  assert.match(r.passages[0].text, /أفضل الأعمال/);
});

test('search ignores tashkeel and unifies forms; reports vol/page/chapter', () => {
  const db = openLibrary(':memory:');
  addBook(db, SAMPLE);
  for (const q of ['الصلاة', 'الصَّلاَةُ', 'الصلاه', 'اما الزكاه', 'أفضل الاعمال']) {
    const hits = searchLibrary(db, q);
    assert.ok(hits.length >= 1, q);
  }
  const [h] = searchLibrary(db, 'الصلاة');
  assert.deepEqual([h.vol, h.page, h.chapter], [1, 6, 'باب فضل الصلاة']); // النص قبل PageV01P006 في الصفحة 6
  assert.ok(h.source.includes('OpenITI'));
});

test('prefixed forms are found: الصلاة → بالصلاة، صلاة → الصلاة، no root-letter cuts', () => {
  const db = openLibrary(':memory:');
  addBook(db, SAMPLE.replace('# أَمَّا الزكاة', '# فليبدأ بالصلاة وللزكاة والكتاب ثم تاب'));
  assert.equal(searchLibrary(db, 'الصلاة').length, 2);   // الصَّلاةُ + بالصلاة
  assert.equal(searchLibrary(db, 'صلاة').length, 2);
  assert.equal(searchLibrary(db, 'الزكاة').length, 1);    // وللزكاة
  assert.equal(searchLibrary(db, 'كتاب').length, 1);      // والكتاب
  assert.equal(searchLibrary(db, 'كتاب تاب').length, 1);
  assert.equal(searchLibrary(db, 'تاب عمود').length, 0);  // «الكتاب» لا يطابق «تاب»
});

test('ms markers are hidden from the reader', () => {
  const r = parseOpenITI(SAMPLE);
  assert.ok(!r.passages.some((p) => /ms\d/.test(p.text)));
});

test('snippet centres on the match in a long passage', () => {
  const long = Array.from({ length: 200 }, (_, i) => 'كلمه' + i).join(' ') + ' الصَّلاة آخر';
  const s = snippetAround(long, 'الصلاه');
  assert.ok(s.startsWith('… ') && s.includes('الصَّلاة'));
});

test('hostile query cannot break FTS syntax', () => {
  assert.ok(toFtsQuery('" OR *').startsWith('("OR"*')); // الكلمة محصورة بين علامتي تنصيص فلا تُفسَّر عامل
  assert.equal(toFtsQuery('" * -'), '');
  const db = openLibrary(':memory:');
  assert.doesNotThrow(() => searchLibrary(db, 'a"b NEAR( ) -x'));
});
