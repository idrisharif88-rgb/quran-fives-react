#!/usr/bin/env node
// الاستعمال: node build.js <library.db> <book.mARkdown> [--source "..."] ...
// يعمل على أي كتاب من OpenITI. إعادة التشغيل على الكتاب نفسه تستبدله.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { parseOpenITI } from './parse.js';
import { indexText } from './normalize.js';
import { SCHEMA } from './schema.js';

export const DEFAULT_SOURCE = 'OpenITI';

export function openLibrary(file) {
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return db;
}

export function addBook(db, raw, { source = DEFAULT_SOURCE, uri: givenUri } = {}) {
  const { meta, chapters, pages, passages } = parseOpenITI(raw);
  const uri = givenUri || (meta['000.BookURI'] || '').replace(/^#/, '') || meta['030.LibURI'];
  if (!uri) throw new Error('الكتاب بلا معرّف (BookURI)');
  const old = db.prepare('SELECT id FROM book WHERE uri=?').get(uri);
  db.exec('BEGIN');
  try {
    if (old) {
      for (const t of ['passage', 'page', 'chapter']) db.prepare(`DELETE FROM ${t} WHERE book_id=?`).run(old.id);
      db.prepare('DELETE FROM book WHERE id=?').run(old.id);
    }
    const died = parseInt(meta['011.AuthorDIED'] || meta['006.AuthorDIED'] || meta['019.AuthorDIED'], 10);
    const { lastInsertRowid: bookId } = db.prepare(
      'INSERT INTO book(uri,title,author,death_ah,editor,source,source_url) VALUES(?,?,?,?,?,?,?)',
    ).run(uri, meta['020.BookTITLE'] || meta['010.BookTITLE'] || uri, meta['010.AuthorNAME'] || meta['001.AuthorNAME'] || null, Number.isNaN(died) ? null : died,
      meta['040.EdEDITOR'] || meta['013.EdPUBLISHER'] || null, source, meta['031.LibREADONLINE'] || null);
    const chIds = new Map();
    const pgIds = new Map();
    const insCh = db.prepare('INSERT INTO chapter(book_id,parent_id,level,title,seq) VALUES(?,?,?,?,?)');
    for (const c of chapters) {
      const r = insCh.run(bookId, c.parent ? chIds.get(c.parent) : null, c.level, c.title, c.id);
      chIds.set(c.id, r.lastInsertRowid);
    }
    const insPg = db.prepare('INSERT INTO page(book_id,vol,page) VALUES(?,?,?)');
    for (const p of pages) pgIds.set(p.id, insPg.run(bookId, p.vol, p.page).lastInsertRowid);
    const insPs = db.prepare('INSERT INTO passage(book_id,chapter_id,page_id,seq,text,text_norm) VALUES(?,?,?,?,?,?)');
    passages.forEach((p, i) => insPs.run(bookId, p.chapter ? chIds.get(p.chapter) : null,
      p.page ? pgIds.get(p.page) : null, i + 1, p.text, indexText(p.text)));
    db.exec('COMMIT');
    db.exec("INSERT INTO passage_fts(passage_fts) VALUES('rebuild')");
    return { bookId: Number(bookId), uri, chapters: chapters.length, pages: pages.length, passages: passages.length };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dbFile, ...files] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!dbFile || !files.length) {
    console.error('node build.js <library.db> <book.mARkdown> [...]');
    process.exit(1);
  }
  const db = openLibrary(dbFile);
  for (const f of files) {
    // المعرّف الرسمي في ملف .yml المجاور (VERS#URI)؛ وإلا من رأس الملف
    const yml = f.replace(/\.mARkdown$/, '') + '.yml';
    const m = fs.existsSync(yml) && fs.readFileSync(yml, 'utf8').match(/VERS#URI#+:\s*(\S+)/);
    console.log(addBook(db, fs.readFileSync(f, 'utf8'), { uri: m ? m[1] : undefined }));
  }
  db.exec('VACUUM');
}
