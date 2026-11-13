import { useEffect, useRef, useState } from 'react';
import { arabicNumber, counted, COUNTED } from '../../utils/libraryText';

// لوحة اختيار الكتب: الأقسام والكتب بمربعات اختيار وعدد نتائج كلٍّ (إن كان هناك بحث)
export default function LibraryBookSheet({ books, sections, counts, selected, hasQuery, onApply, onClose }) {
  const [draft, setDraft] = useState(() => new Set(selected));
  const applyRef = useRef(null);
  useEffect(() => { applyRef.current?.focus(); }, []);

  const toggle = (ids, on) => setDraft((prev) => {
    const next = new Set(prev);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    return next;
  });
  const countOf = (id) => counts[id] || 0;
  const shown = books.filter((b) => !draft.size || draft.has(b.id)).reduce((sum, b) => sum + countOf(b.id), 0);

  return (
    <>
      <div className="library-scrim" onClick={onClose} />
      <div className="library-sheet" role="dialog" aria-modal="true" aria-labelledby="library-sheet-title">
        <div className="library-grab" />
        <div className="library-sheet-head">
          <h2 id="library-sheet-title">اختر الكتب</h2>
          <button type="button" className="library-link" onClick={() => setDraft(new Set())}>مسح الكل</button>
        </div>
        <div className="library-sheet-body">
          {sections.map((sec) => {
            const inSec = books.filter((b) => b.section === sec.id);
            if (!inSec.length) return null;
            const ids = inSec.map((b) => b.id);
            const all = ids.every((id) => draft.has(id));
            const some = ids.some((id) => draft.has(id));
            return (
              <fieldset key={sec.id} className="library-facet">
                <label className="library-facet-head">
                  <input type="checkbox" checked={all} ref={(el) => { if (el) el.indeterminate = some && !all; }}
                    onChange={(e) => toggle(ids, e.target.checked)} />
                  {sec.name}
                  {hasQuery && <span className="library-n">{arabicNumber(ids.reduce((n, id) => n + countOf(id), 0))}</span>}
                </label>
                {inSec.map((b) => (
                  <label key={b.id} className={`library-opt ${hasQuery && !countOf(b.id) ? 'zero' : ''}`.trim()}>
                    <input type="checkbox" checked={draft.has(b.id)} onChange={(e) => toggle([b.id], e.target.checked)} />
                    {b.name}
                    {hasQuery && <span className="library-n">{arabicNumber(countOf(b.id))}</span>}
                  </label>
                ))}
              </fieldset>
            );
          })}
        </div>
        <div className="library-sheet-foot">
          <button ref={applyRef} type="button" className="library-apply" onClick={() => onApply([...draft])}>
            {hasQuery ? (shown ? `اعرض ${counted(shown, COUNTED.results)}` : 'لا نتائج') : 'تم'}
          </button>
        </div>
      </div>
    </>
  );
}
