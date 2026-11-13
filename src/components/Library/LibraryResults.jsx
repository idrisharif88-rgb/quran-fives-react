import { counted, COUNTED } from '../../utils/libraryText';
import LibraryHit from './LibraryHit';

// النتائج: طريقة البحث، الكتب المختارة كوسوم تُزال، الملخص والترتيب،
// ثم النتائج مجمّعة حسب الكتاب — أو قائمة كتاب واحد بصفحاتها
export default function LibraryResults({ s, onOpen }) {
  if (s.tooShort) return <p className="library-hint">اكتب حرفين على الأقل</p>;
  const nameOf = (id) => s.books.find((b) => b.id === id)?.name || '';
  const bookCount = s.single ? 1 : s.groups.length;
  return (
    <>
      <div className="library-mode" role="group" aria-label="طريقة البحث">
        <button type="button" aria-pressed={!s.exact} onClick={() => s.setExact(false)}>كل الكلمات</button>
        <button type="button" aria-pressed={s.exact} onClick={() => s.setExact(true)}>العبارة كما هي</button>
      </div>
      {s.selected.length > 0 && (
        <div className="library-pills">
          {s.selected.map((id) => (
            <button key={id} type="button" className="library-pill" aria-label={`إزالة ${nameOf(id)}`}
              onClick={() => s.setSelected(s.selected.filter((x) => x !== id))}>
              <b aria-hidden="true">×</b>{nameOf(id)}
            </button>
          ))}
        </div>
      )}
      <div className="library-summary">
        <span><strong>{s.total ? counted(s.total, COUNTED.results) : 'لا نتائج'}</strong>{bookCount > 1 && ` في ${counted(bookCount, COUNTED.books)}`}</span>
        <button type="button" className="library-sort" onClick={() => s.setOrder(s.order === 'rank' ? 'book' : 'rank')}>
          الترتيب: {s.order === 'rank' ? 'الأقرب' : 'ترتيب الكتاب'}
        </button>
      </div>


      {s.single ? (
        <div className="library-list">
          {s.list.map((h) => <LibraryHit key={h.id} hit={h} query={s.query} onOpen={onOpen} />)}
          {!s.loading && s.hasMore && <button type="button" className="library-more" onClick={s.loadMore}>المزيد</button>}
        </div>
      ) : (
        <div className="library-groups">
          {s.groups.map((g) => (
            <section key={g.bookId} className="library-group">
              <div className="library-group-head">
                <h3>{g.book}</h3>
                <span>{counted(g.count, COUNTED.results)}</span>
                {g.count > g.hits.length && <button type="button" onClick={() => s.setSelected([g.bookId])}>عرض الكل</button>}
              </div>
              {g.hits.map((h) => <LibraryHit key={h.id} hit={h} query={s.query} onOpen={onOpen} />)}
            </section>
          ))}
        </div>
      )}
      {s.loading && <p className="library-hint">جارٍ البحث…</p>}
    </>
  );
}
