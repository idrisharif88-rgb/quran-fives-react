export const SCHEMA = `
CREATE TABLE IF NOT EXISTS book (
  id INTEGER PRIMARY KEY, uri TEXT UNIQUE NOT NULL, title TEXT NOT NULL, author TEXT,
  death_ah INTEGER, editor TEXT, source TEXT NOT NULL, source_url TEXT
);
CREATE TABLE IF NOT EXISTS chapter (
  id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, parent_id INTEGER, level INTEGER NOT NULL,
  title TEXT NOT NULL, seq INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS page (
  id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, vol INTEGER NOT NULL, page INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS passage (
  id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, chapter_id INTEGER, page_id INTEGER,
  seq INTEGER NOT NULL, text TEXT NOT NULL, text_norm TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS passage_book ON passage(book_id, seq);
CREATE INDEX IF NOT EXISTS passage_chapter ON passage(chapter_id);
CREATE VIRTUAL TABLE IF NOT EXISTS passage_fts USING fts5(
  text_norm, content='passage', content_rowid='id', tokenize='unicode61 remove_diacritics 0'
);
`;
