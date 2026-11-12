import { toFtsQuery, normalizeArabic } from './normalize.js';
import { sourceOf } from './sources.js';

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

// بحث نصي كامل. يعيد مقاطع قصيرة مع الكتاب والباب والمجلد والصفحة.
export function searchLibrary(db, q, { bookId = null, limit = 20, offset = 0 } = {}) {
  const fts = toFtsQuery(q);
  if (!fts) return [];
  const rows = db.prepare(`
    SELECT p.id, p.text, b.id AS book_id, b.title AS book, b.author, b.source,
           c.title AS chapter, pg.vol, pg.page
    FROM passage_fts
    JOIN passage p ON p.id = passage_fts.rowid
    JOIN book b ON b.id = p.book_id
    LEFT JOIN chapter c ON c.id = p.chapter_id
    LEFT JOIN page pg ON pg.id = p.page_id
    WHERE passage_fts MATCH ? ${bookId ? 'AND p.book_id = ?' : ''}
    ORDER BY rank LIMIT ? OFFSET ?`).all(...(bookId ? [fts, bookId] : [fts]), limit, offset);
  return rows.map((r) => ({
    id: r.id, bookId: r.book_id, book: r.book, author: r.author, source: r.source,
    chapter: r.chapter, vol: r.vol, page: r.page,
    snippet: snippetAround(r.text, q),
  }));
}

export function listBooks(db) {
  return db.prepare(`SELECT b.id, b.title, b.author, b.death_ah AS deathAh, b.source, b.source_url AS sourceUrl,
      (SELECT COUNT(*) FROM passage WHERE book_id = b.id) AS passages
    FROM book b ORDER BY b.death_ah, b.id`).all();
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
  return { ...rest, ...sourceOf(uri, p.vol, p.page), bookId: book_id, chapterPath: path, prevId: near('<', 'DESC'), nextId: near('>', 'ASC') };
}
