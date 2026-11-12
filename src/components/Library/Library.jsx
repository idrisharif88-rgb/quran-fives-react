import { useEffect, useState } from 'react';
import useLibrarySearch from '../../hooks/useLibrarySearch';
import { placeLabel } from '../../utils/libraryText';
import { BackIcon, SearchIcon } from './LibraryIcons';
import LibraryText from './LibraryText';
import LibraryStatus from './LibraryStatus';
import LibraryReader from './LibraryReader';
import './Library.css';

const shortTitle = (t) => t.replace(/\s*\([^)]*\)\s*/g, ' ').trim();

// «المكتبة»: بحث في كتب OpenITI على السيرفر. يحتاج إنترنت وحساباً موافَقاً عليه.
export default function Library({ onClose, backRef }) {
  const s = useLibrarySearch();
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (!backRef) return undefined;
    const close = () => (openId ? setOpenId(null) : onClose());
    backRef.current = close;
    return () => { if (backRef.current === close) backRef.current = null; };
  }, [backRef, openId, onClose]);

  return (
    <div className="library-overlay" dir="rtl">
      {openId ? (
        <LibraryReader key={openId} id={openId} query={s.query} onBack={() => setOpenId(null)} />
      ) : (
        <div className="library-screen">
          <div className="library-top">
            <h2>المكتبة</h2>
            <button type="button" className="library-icon" onClick={onClose} aria-label="رجوع"><BackIcon /></button>
          </div>

          <label className="library-search">
            <SearchIcon />
            <input
              id="library-query"
              value={s.query}
              onChange={(e) => s.setQuery(e.target.value)}
              placeholder="ابحث في الكتب…"
              aria-label="كلمة البحث"
              autoFocus
              dir="rtl"
            />
          </label>

          {s.books.length > 1 && (
            <div className="library-chips">
              <button type="button" className={`library-chip ${s.bookId ? '' : 'on'}`.trim()} onClick={() => s.setBookId(null)}>الكل</button>
              {s.books.map((b) => (
                <button key={b.id} type="button" className={`library-chip ${s.bookId === b.id ? 'on' : ''}`.trim()} onClick={() => s.setBookId(b.id)}>
                  {shortTitle(b.title)}
                </button>
              ))}
            </div>
          )}

          {s.error ? (
            <LibraryStatus kind={s.error} onRetry={s.retry} />
          ) : (
            <>
              {!s.query.trim() && <p className="library-hint">اكتب كلمة أو أكثر. التشكيل لا يلزم.</p>}
              {s.query.trim() && !s.loading && s.results.length === 0 && <p className="library-hint">لا نتائج</p>}
              <div className="library-list">
                {s.results.map((r) => (
                  <button key={r.id} type="button" className="library-hit" onClick={() => setOpenId(r.id)}>
                    <span className="library-meta">
                      <span className="library-book">{shortTitle(r.book)}</span>
                      <span className="library-where">{placeLabel(r)}</span>
                    </span>
                    {r.chapter && <span className="library-chap">{r.chapter}</span>}
                    <span className="library-snip"><LibraryText text={r.snippet} query={s.query} /></span>
                  </button>
                ))}
              </div>
              {s.loading && <p className="library-hint">جارٍ البحث…</p>}
              {!s.loading && s.hasMore && <button type="button" className="library-more" onClick={s.loadMore}>المزيد</button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
