import { counted, COUNTED } from '../../utils/libraryText';
import LibraryRecent from './LibraryRecent';

// قبل البحث: تلميح، عمليات البحث السابقة، والكتب بأقسامها — الضغط على كتاب يحصر البحث فيه
export default function LibraryHome({ books, sections, recent, onSearch, onForget, onClear, onPickBook }) {
  return (
    <div className="library-home">
      <p className="library-tip">اكتب كلمة أو أكثر. التشكيل لا يلزم، و«الصلاة» تجد «بالصلاة» و«والصلاة». أو اختر كتاباً لتبحث فيه وحده.</p>
      <LibraryRecent recent={recent} onSearch={onSearch} onForget={onForget} onClear={onClear} />
      {sections.map((s) => {
        const inSection = books.filter((b) => b.section === s.id);
        if (!inSection.length) return null;
        return (
          <section key={s.id} className="library-shelf">
            <h3>{s.name}<span>{counted(inSection.length, COUNTED.books)}</span></h3>
            <div className="library-cards">
              {inSection.map((b) => (
                <button key={b.id} type="button" className="library-card" onClick={() => onPickBook(b.id)}>
                  <b>{b.name}</b>
                  {b.by && <small>{b.by}</small>}
                  {b.vols > 0 && <small>{counted(b.vols, COUNTED.volumes)}</small>}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
