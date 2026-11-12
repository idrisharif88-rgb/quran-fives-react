import { toFtsQuery, normalizeArabic } from './normalize.js';
import { sourceOf, bookInfo, SECTIONS } from './sources.js';

const WINDOW = 40; // كلمات المقطع المعروض في النتيجة

// مقطع حول أول كلمة مطابقة، لا أول النص: المطابقة قد تقع في آخر حديث طويل
export function snippetAround(text, q) {
  const terms = normalizeArabic(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const words = text.split(/\s+/);
  if (words.length <= WINDOW) return text;
  const bare = (w) => normalizeArabic(w).replace(/[^\p{L}\p{N}]/gu, '');
  let hit = words.findIndex((w) => terms.some((t) => bare(w).includes(t)));
  if (hit < 0) hit = 0;
  const start = Math.max(0, Math.min(hit - 10, words.length - WINDOW));
  const end = start + WINDOW;
  return (start > 0 ? '… ' : '') + words.slice(start, end).join(' ') + (end < words.length ? ' …' : '');
}

const SELECT_HIT = `
    SELECT p.id, p.seq, p.text, b.id AS book_id, b.uri, b.title AS book_title,
           c.title AS chapter, pg.vol, pg.page
    FROM passage_fts
    JOIN passage p ON p.id = passage_fts.rowid
    JOIN book b ON b.id = p.book_id
    LEFT JOIN chapter c ON c.id = p.chapter_id
    LEFT JOIN page pg ON pg.id = p.page_id`;

const inBooks = (ids) => (ids?.length ? `AND p.book_id IN (${ids.map(() => '?').join(',')})` : '');

const toHit = (r, q) => ({
  id: r.id, bookId: r.book_id, book: bookInfo(r.uri, r.book_title).name,
  chapter: r.chapter, vol: r.vol, page: r.page,
  snippet: snippetAround(r.text, q),
});

// بحث نصي كامل. bookIds فارغة = كل الكتب. order: rank (الأقرب) | book (ترتيب الكتاب)
export function searchLibrary(db, q, { bookIds = [], limit = 20, offset = 0, exact = false, order = 'rank' } = {}) {
  const fts = toFtsQuery(q, { exact });
  if (!fts) return [];
  const rows = db.prepare(`${SELECT_HIT}
    WHERE passage_fts MATCH ? ${inBooks(bookIds)}
    ORDER BY ${order === 'book' ? 'p.book_id, p.seq' : 'rank'} LIMIT ? OFFSET ?`).all(fts, ...bookIds, limit, offset);
  return rows.map((r) => toHit(r, q));
}

// عدد النتائج في كل كتاب — لأرقام لوحة الكتب
export function countByBook(db, q, { exact = false } = {}) {
  const fts = toFtsQuery(q, { exact });
  if (!fts) return {};
  const rows = db.prepare(`SELECT p.book_id AS id, count(*) AS n FROM passage_fts
    JOIN passage p ON p.id = passage_fts.rowid WHERE passage_fts MATCH ? GROUP BY p.book_id`).all(fts);
  return Object.fromEntries(rows.map((r) => [r.id, r.n]));
}

// النتائج مجمّعة: أقرب perBook نتائج من كل كتاب، والكتب بحسب عدد نتائجها
export function groupedResults(db, q, { bookIds = [], exact = false, perBook = 2, order = 'rank' } = {}) {
  const fts = toFtsQuery(q, { exact });
  if (!fts) return [];
  const counts = countByBook(db, q, { exact });
  const rows = db.prepare(`SELECT * FROM (
      SELECT h.*, row_number() OVER (PARTITION BY h.book_id ORDER BY ${order === 'book' ? 'h.seq' : 'h.score'}) AS rn
      FROM (${SELECT_HIT.replace('SELECT p.id,', 'SELECT bm25(passage_fts) AS score, p.id,')}
        WHERE passage_fts MATCH ? ${inBooks(bookIds)}) h
    ) WHERE rn <= ?`).all(fts, ...bookIds, perBook);
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.book_id)) groups.set(r.book_id, { bookId: r.book_id, book: bookInfo(r.uri, r.book_title).name, count: counts[r.book_id] || 0, hits: [] });
    groups.get(r.book_id).hits.push(toHit(r, q));
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

// الكتب مع قسمها واسمها المختصر وعدد مجلداتها، بترتيب الأقسام ثم الترتيب داخل القسم
export function listBooks(db) {
  const order = Object.fromEntries(SECTIONS.map((s, i) => [s.id, i]));
  return db.prepare(`SELECT b.id, b.uri, b.title,
      (SELECT COUNT(DISTINCT vol) FROM page WHERE book_id = b.id) AS vols,
      (SELECT COUNT(*) FROM passage WHERE book_id = b.id) AS passages
    FROM book b`).all()
    .map(({ uri, title, ...b }) => ({ ...b, ...bookInfo(uri, title) }))
    .sort((a, b) => (order[a.section] ?? 9) - (order[b.section] ?? 9) || a.order - b.order);
}

// نص مقطع كامل مع مساره (باب ← أب) والمقطعين المجاورين
export function getPassage(db, id) {
  const p = db.prepare(`
    SELECT p.id, p.seq, p.text, p.chapter_id, p.book_id, b.uri, b.title AS book, b.author, b.source, b.source_url AS sourceUrl,
           pg.vol, pg.page
    FROM passage p JOIN book b ON b.id = p.book_id LEFT JOIN page pg ON pg.id = p.page_id
    WHERE p.id = ?`).get(id);
  if (!p) return null;
  const path = [];
  for (let cid = p.chapter_id; cid && path.length < 8;) {
    const c = db.prepare('SELECT title, parent_id FROM chapter WHERE id = ?').get(cid);
    if (!c) break;
    path.unshift(c.title);
    cid = c.parent_id;
  }
  const near = (op, ord) => db.prepare(`SELECT id FROM passage WHERE book_id = ? AND seq ${op} ? ORDER BY seq ${ord} LIMIT 1`)
    .get(p.book_id, p.seq)?.id ?? null;
  const { chapter_id, book_id, seq, uri, source, sourceUrl, ...rest } = p; // eslint-disable-line no-unused-vars
  return { ...rest, book: bookInfo(uri, rest.book).name, ...sourceOf(uri, p.vol, p.page), bookId: book_id, chapterPath: path, prevId: near('<', 'DESC'), nextId: near('>', 'ASC') };
}
