import fs from 'node:fs';
import path from 'node:path';
import { searchLibrary, groupedResults, listBooks, getPassage } from './library/search.js';
import { SECTIONS } from './library/sources.js';
import { createLru } from './library/cache.js';

// مكتبة الكتب الشيعية (OpenITI): قاعدة SQLite للقراءة فقط على الخادم.
// تُبنى بـ `node library/build.js` وتُرفع بجانب البيانات؛ إن غابت أجابت المسارات 503
// ولا يتأثّر باقي الخادم. node:sqlite يُحمَّل عند أول طلب فلا يمنع تشغيل الخادم على Node قديم.
const MAX_Q = 200;
const toInt = (v, def, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

export function registerLibraryRoutes(app, { requireAccount, dataDir, libraryFile }) {
  const file = libraryFile || path.join(dataDir, 'library', 'library.db');
  let db = null;

  async function open() {
    if (db) return db;
    if (!fs.existsSync(file)) return null;
    const { DatabaseSync } = await import('node:sqlite');
    db = new DatabaseSync(file, { readOnly: true });
    return db;
  }

  // يفتح القاعدة أو يجيب 503 ثم يشغّل المعالج
  const withDb = (handler) => async (req, res) => {
    let conn;
    try { conn = await open(); } catch (e) {
      console.error('library: لا يمكن فتح القاعدة —', e.message);
      return res.status(503).json({ error: 'المكتبة غير متوفرة' });
    }
    if (!conn) return res.status(503).json({ error: 'المكتبة غير متوفرة' });
    try { await handler(conn, req, res); } catch (e) {
      console.error('library:', e.message);
      res.status(500).json({ error: 'تعذّر البحث' });
    }
  };

  app.get('/api/library/books', requireAccount, withDb((conn, req, res) => {
    res.json({ books: listBooks(conn), sections: SECTIONS });
  }));

  const lru = createLru();
  const cached = (kind, p, run) => {
    const key = JSON.stringify([kind, p]);
    let v = lru.get(key);
    if (v === undefined) lru.set(key, (v = run()));
    return v;
  };

  // books=1,2,3 (أو book=1 القديم)، exact=1 للعبارة كما هي، order=book لترتيب الكتاب
  const params = (req) => ({
    q: String(req.query.q ?? '').slice(0, MAX_Q),
    bookIds: String(req.query.books ?? req.query.book ?? '').split(',').map((v) => toInt(v, 0, 0, 1e9)).filter(Boolean).slice(0, 50),
    exact: req.query.exact === '1',
    order: req.query.order === 'book' ? 'book' : 'rank',
  });

  app.get('/api/library/search', requireAccount, withDb((conn, req, res) => {
    const p = { ...params(req), limit: toInt(req.query.limit, 20, 1, 50), offset: toInt(req.query.offset, 0, 0, 10000) };
    res.json(cached('search', p, () => ({ results: searchLibrary(conn, p.q, p), limit: p.limit, offset: p.offset })));
  }));

  // النتائج مجمّعة حسب الكتاب، مع عدد النتائج في كل كتاب (للوحة الكتب)
  app.get('/api/library/grouped', requireAccount, withDb((conn, req, res) => {
    const p = params(req);
    res.json(cached('grouped', p, () => groupedResults(conn, p.q, p)));
  }));

  app.get('/api/library/passage/:id', requireAccount, withDb((conn, req, res) => {
    const passage = getPassage(conn, toInt(req.params.id, 0, 0, 1e9));
    if (!passage) return res.status(404).json({ error: 'غير موجود' });
    res.json(passage);
  }));
}
