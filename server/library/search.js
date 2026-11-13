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

// البحث على مرحلتين: (1) ترتيب على المعرّفات والدرجات وحدها داخل فهرس FTS5، (2) جلب النص
// للفائزين فقط. الترتيب كما هو تماماً، لكن «قال» (86 ألف مطابقة) لا يُحمَّل نصها كله.
// التعادل يُكسر برقم المقطع فتثبت النتائج بين طلب وآخر.

// عبارات SQL المحضّرة تُحفظ لكل قاعدة: التحضير أغلى من التنفيذ في الطلبات القصيرة
const stmts = new WeakMap();
function stmt(db, sql) {
  let cache = stmts.get(db);
  if (!cache) stmts.set(db, (cache = new Map()));
  let s = cache.get(sql);
  if (!s) cache.set(sql, (s = db.prepare(sql)));
  return s;
}

const inBooks = (ids) => (ids?.length ? `AND p.book_id IN (${ids.map(() => '?').join(',')})` : '');
const RANK = 'bm25(passage_fts), passage_fts.rowid';

// المرحلة الثانية: نص المقاطع المختارة بترتيبها
function hydrate(db, ids, q) {
  if (!ids.length) return [];
  const rows = stmt(db, `
    SELECT p.id, p.text, b.id AS book_id, b.uri, b.title AS book_title, c.title AS chapter, pg.vol, pg.page
    FROM passage p JOIN book b ON b.id = p.book_id
    LEFT JOIN chapter c ON c.id = p.chapter_id LEFT JOIN page pg ON pg.id = p.page_id
    WHERE p.id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter(Boolean).map((r) => ({
    id: r.id, bookId: r.book_id, book: bookInfo(r.uri, r.book_title).name,
    chapter: r.chapter, vol: r.vol, page: r.page,
    snippet: snippetAround(r.text, q),
  }));
}

// قائمة واحدة. bookIds فارغة = كل الكتب. order: rank (الأقرب) | book (ترتيب الكتاب)
export function searchLibrary(db, q, { bookIds = [], limit = 20, offset = 0, exact = false, order = 'rank' } = {}) {
  const fts = toFtsQuery(q, { exact });
  if (!fts) return [];
  const ids = stmt(db, `SELECT passage_fts.rowid AS id FROM passage_fts
    ${bookIds.length || order === 'book' ? 'JOIN passage p ON p.id = passage_fts.rowid' : ''}
    WHERE passage_fts MATCH ? ${inBooks(bookIds)}
    ORDER BY ${order === 'book' ? 'p.book_id, p.seq' : RANK} LIMIT ? OFFSET ?`)
    .all(fts, ...bookIds, limit, offset).map((r) => r.id);
  return hydrate(db, ids, q);
}

// عدد النتائج في كل كتاب — مرة واحدة لكل بحث
export function countByBook(db, q, { exact = false } = {}) {
  const fts = toFtsQuery(q, { exact });
  if (!fts) return {};
  const rows = stmt(db, `SELECT p.book_id AS id, count(*) AS n FROM passage_fts
    JOIN passage p ON p.id = passage_fts.rowid WHERE passage_fts MATCH ? GROUP BY p.book_id`).all(fts);
  return Object.fromEntries(rows.map((r) => [r.id, r.n]));
}

// مجمّعة: أقرب perBook من كل كتاب، والكتب بحسب عدد نتائجها. يعيد { groups, counts }.
// بلا تصفية بالكتب يأتي العدد من المرور نفسه (count OVER)، فيُقرأ الفهرس مرة واحدة؛
// ومع التصفية يُحسب العدد لكل الكتب على حدة، لأن لوحة الكتب تعرض أرقامها كلها.
export function groupedResults(db, q, { bookIds = [], exact = false, perBook = 2, order = 'rank' } = {}) {
  const fts = toFtsQuery(q, { exact });
  if (!fts) return { groups: [], counts: {} };
  // الدرجة تُحسب في الطبقة الداخلية: SQLite لا يقبل bm25 داخل دالتي نافذة
  const top = stmt(db, `SELECT id, book_id, n FROM (
      SELECT id, book_id,
             row_number() OVER (PARTITION BY book_id ORDER BY ${order === 'book' ? 'seq' : 'score, id'}) AS rn,
             count(*) OVER (PARTITION BY book_id) AS n
      FROM (SELECT passage_fts.rowid AS id, p.book_id, p.seq, bm25(passage_fts) AS score
            FROM passage_fts JOIN passage p ON p.id = passage_fts.rowid
            WHERE passage_fts MATCH ? ${inBooks(bookIds)})
    ) WHERE rn <= ?`).all(fts, ...bookIds, perBook);
  const counts = bookIds.length ? countByBook(db, q, { exact }) : Object.fromEntries(top.map((r) => [r.book_id, r.n]));
  const groups = new Map();
  for (const h of hydrate(db, top.map((r) => r.id), q)) {
    if (!groups.has(h.bookId)) groups.set(h.bookId, { bookId: h.bookId, book: h.book, count: counts[h.bookId] || 0, hits: [] });
    groups.get(h.bookId).hits.push(h);
  }
  return { groups: [...groups.values()].sort((a, b) => b.count - a.count || a.bookId - b.bookId), counts };
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
