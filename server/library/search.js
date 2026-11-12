import { toFtsQuery } from './normalize.js';

// بحث نصي كامل. يعيد مقاطع قصيرة مع الكتاب والباب والمجلد والصفحة.
export function searchLibrary(db, q, { bookId = null, limit = 20, offset = 0 } = {}) {
  const fts = toFtsQuery(q);
  if (!fts) return [];
  const rows = db.prepare(`
    SELECT p.id, p.text, b.id AS book_id, b.title AS book, b.author, b.source,
           c.title AS chapter, pg.vol, pg.page,
           snippet(passage_fts, 0, '«', '»', ' … ', 24) AS snippet_norm
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
    snippet: r.text.length > 300 ? r.text.slice(0, 300) + ' …' : r.text,
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
    SELECT p.id, p.seq, p.text, p.chapter_id, p.book_id, b.title AS book, b.author, b.source, b.source_url AS sourceUrl,
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
  const { chapter_id, book_id, seq, ...rest } = p; // eslint-disable-line no-unused-vars
  return { ...rest, bookId: book_id, chapterPath: path, prevId: near('<', 'DESC'), nextId: near('>', 'ASC') };
}
