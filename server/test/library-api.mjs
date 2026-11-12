import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../app.js';
import { migrateLegacyOwner } from '../accounts.js';
import { openLibrary, addBook } from '../library/build.js';

const SAMPLE = `#META# 000.BookURI :: #0001.Test.Book
#META# 020.BookTITLE :: كتاب تجريبي
#META# 011.AuthorDIED :: 100
#META#Header#End#

### | (كتاب الصلاة)
PageV01P005
# الصَّلاةُ عمود الدين
# أَمَّا الزكاة فهي واجبة
`;

let dataDir, srv, base, noLib;
const auth = { Authorization: 'Basic ' + Buffer.from('owner:12345').toString('base64') };
const get = async (route, headers = auth, origin = base) => {
  const r = await fetch(origin + route, { headers });
  return { status: r.status, json: await r.json() };
};
const listen = async (opts) => {
  const { app, store, accounts } = createApp({ dataDir, adminUser: 'Owner', ...opts });
  const s = await new Promise((resolve) => { const x = app.listen(0, () => resolve(x)); });
  return { s, store, accounts, origin: `http://127.0.0.1:${s.address().port}` };
};

before(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'quran-lib-'));
  const libFile = path.join(dataDir, 'lib.db');
  const db = openLibrary(libFile);
  addBook(db, SAMPLE);
  db.close();
  const a = await listen({ libraryFile: libFile });
  srv = a.s; base = a.origin;
  await migrateLegacyOwner({ store: a.store, accounts: a.accounts, dataDir, user: 'Owner', code: '12345' });
  noLib = await listen({ libraryFile: path.join(dataDir, 'missing.db') });
});

after(async () => {
  srv.close(); noLib.s.close();
  await fs.rm(dataDir, { recursive: true, force: true });
});

test('المكتبة تتطلّب حساباً', async () => {
  assert.equal((await get('/api/library/books', {})).status, 401);
  assert.equal((await get('/api/library/search?q=x', {})).status, 401);
});

test('كتب + بحث + مقطع، والمصدر مذكور', async () => {
  const books = await get('/api/library/books');
  assert.equal(books.json.books.length, 1);
  assert.equal(books.json.sections.length, 3);
  assert.equal(books.json.books[0].name, 'كتاب تجريبي');

  const grouped = await get('/api/library/grouped?q=' + encodeURIComponent('الصلاة'));
  assert.equal(grouped.json.groups.length, 1);
  assert.deepEqual(Object.values(grouped.json.counts), [1]);
  assert.equal((await get('/api/library/search?exact=1&q=' + encodeURIComponent('الدين عمود'))).json.results.length, 0);

  const found = await get('/api/library/search?q=' + encodeURIComponent('الصَّلاة'));
  assert.equal(found.json.results.length, 1);
  const hit = found.json.results[0];
  assert.deepEqual([hit.vol, hit.page, hit.chapter], [1, 5, 'كتاب الصلاة']);

  const full = await get('/api/library/passage/' + hit.id);
  assert.equal(full.status, 200);
  assert.deepEqual(full.json.chapterPath, ['كتاب الصلاة']);
  assert.equal(full.json.prevId, null);
  assert.ok(full.json.nextId);
  assert.equal(full.json.digital, 'OpenITI');
  assert.equal(full.json.compareUrl, null); // كتاب الاختبار ليس في جدول الطبعات
});

test('مدخلات سيئة: استعلام فارغ، حدود، مقطع غير موجود', async () => {
  assert.deepEqual((await get('/api/library/search')).json.results, []);
  assert.deepEqual((await get('/api/library/search?q=' + encodeURIComponent('" * ('))).json.results, []);
  assert.equal((await get('/api/library/search?q=ا&limit=9999&offset=-5')).json.limit, 50);
  assert.equal((await get('/api/library/passage/99999')).status, 404);
  assert.equal((await get('/api/library/passage/abc')).status, 404);
});

test('غياب القاعدة → 503 ولا ينهار الخادم', async () => {
  const a = await get('/api/library/books', auth, noLib.origin);
  assert.equal(a.status, 503);
  assert.equal((await get('/api/health', {}, noLib.origin)).status, 200);
});
