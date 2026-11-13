import { useEffect, useRef, useState } from 'react';
import useLibrarySearch from '../../hooks/useLibrarySearch';
import { counted, COUNTED } from '../../utils/libraryText';
import { BackIcon, SearchIcon, BooksIcon } from './LibraryIcons';
import LibraryStatus from './LibraryStatus';
import LibraryReader from './LibraryReader';
import LibraryHome from './LibraryHome';
import LibraryResults from './LibraryResults';
import LibraryBookSheet from './LibraryBookSheet';
import './Library.css';
import './LibraryBrowse.css';

// «المكتبة»: بحث في كتب OpenITI على السيرفر. يحتاج إنترنت وحساباً موافَقاً عليه.
// قبل البحث: الكتب بأقسامها. بعده: النتائج مجمّعة حسب الكتاب، ولوحة لاختيار الكتب.
export default function Library({ onClose, backRef }) {
  const s = useLibrarySearch();
  const [openId, setOpenId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const inputRef = useRef(null);
  const hasQuery = Boolean(s.query.trim());

  // الرجوع: اللوحة ← النص ← البحث ← إغلاق المكتبة
  useEffect(() => {
    if (!backRef) return undefined;
    const back = () => {
      if (sheetOpen) setSheetOpen(false);
      else if (openId) setOpenId(null);
      else if (hasQuery || s.selected.length) { s.setQuery(''); s.setSelected([]); }
      else onClose();
    };
    backRef.current = back;
    return () => { if (backRef.current === back) backRef.current = null; };
  }, [backRef, sheetOpen, openId, hasQuery, s, onClose]);

  const open = (id) => { s.remember(); setOpenId(id); };
  const single = s.single ? s.books.find((b) => b.id === s.selected[0]) : null;

  if (openId) {
    return (
      <div className="library-overlay" dir="rtl">
        <LibraryReader key={openId} id={openId} query={s.query} onBack={() => setOpenId(null)} />
      </div>
    );
  }

  return (
    <div className="library-overlay" dir="rtl">
      <div className="library-screen">
        <div className="library-top">
          <h2>المكتبة</h2>
          <button type="button" className="library-icon" onClick={onClose} aria-label="رجوع"><BackIcon /></button>
        </div>

        <div className="library-bar">
          <label className="library-search">
            <SearchIcon />
            <input
              id="library-query"
              ref={inputRef}
              value={s.query}
              onChange={(e) => s.setQuery(e.target.value)}
              placeholder={single ? `ابحث في ${single.name}…` : `ابحث في ${counted(s.books.length || 13, COUNTED.books)}…`}
              aria-label="كلمة البحث"
              dir="rtl"
            />
          </label>
          <button type="button" className="library-books-btn" onClick={() => setSheetOpen(true)} aria-label="اختر الكتب">
            <BooksIcon />
            {s.selected.length > 0 && <span className="library-badge">{s.selected.length.toLocaleString('ar-EG')}</span>}
          </button>
        </div>

        {s.error ? (
          <LibraryStatus kind={s.error} onRetry={s.retry} />
        ) : hasQuery ? (
          <LibraryResults s={s} onOpen={open} />
        ) : (
          <LibraryHome
            books={s.books}
            sections={s.sections}
            recent={s.recent}
            onSearch={(q) => s.setQuery(q)}
            onPickBook={(id) => { s.setSelected([id]); inputRef.current?.focus(); }}
          />
        )}
      </div>

      {sheetOpen && (
        <LibraryBookSheet
          books={s.books}
          sections={s.sections}
          counts={s.counts}
          selected={s.selected}
          hasQuery={hasQuery}
          onApply={(ids) => { s.setSelected(ids); setSheetOpen(false); }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
