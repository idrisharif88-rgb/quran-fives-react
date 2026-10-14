import { useEffect, useState } from 'react';
import { fivesOnPage } from '../utils/pageFives';
import { SURAH_METADATA } from '../data/quranConstants';
import './CounterFivesMarks.css';

// أربع زوايا حول الدائرة، بترتيب القراءة: أعلى يمين، أعلى يسار، أسفل يمين، أسفل يسار
const CORNERS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];

const labelOf = (m) => `${SURAH_METADATA[m.surah - 1].name} ${m.ayah}`;

/**
 * آيات الصفحة الجارية التي رقمها من مضاعفات الخمسة (5، 10، 15…) أيقوناتٍ في زوايا دائرة العدّاد.
 * أكثر من أربع: ثلاث و«…» يعرض البقية. الضغط على رقم ينتقل إلى خماسيته.
 * @param backRef يضع فيه إغلاق قائمة «…» ما دامت مفتوحة (زرّ الرجوع في الهاتف)
 */
export default function CounterFivesMarks({ page, onOpen, backRef, children }) {
  const [moreFor, setMoreFor] = useState(null);   // رقم الصفحة التي فُتحت لها «…»
  const marks = fivesOnPage(page);
  const crowded = marks.length > CORNERS.length;
  const shown = crowded ? marks.slice(0, CORNERS.length - 1) : marks;
  const rest = crowded ? marks.slice(CORNERS.length - 1) : [];
  const isMoreOpen = moreFor === page && rest.length > 0;

  useEffect(() => {
    if (!backRef || !isMoreOpen) return undefined;
    const close = () => setMoreFor(null);
    backRef.current = close;
    return () => { if (backRef.current === close) backRef.current = null; };
  }, [backRef, isMoreOpen]);

  const mark = (m, corner) => (
    <button
      key={`${m.surah}:${m.ayah}`}
      type="button"
      className={`counter-five-mark ${corner || ''}`.trim()}
      onClick={() => { setMoreFor(null); onOpen(m); }}
      title={labelOf(m)}
      aria-label={labelOf(m)}
    >
      {m.ayah}
    </button>
  );

  return (
    <div className="counter-fives-wrap">
      {children}
      {shown.map((m, i) => mark(m, CORNERS[i]))}
      {crowded && (
        <button
          type="button"
          className={`counter-five-mark more ${CORNERS[CORNERS.length - 1]}`}
          onClick={() => setMoreFor(isMoreOpen ? null : page)}
          aria-expanded={isMoreOpen}
          aria-label="بقية الآيات"
        >
          …
        </button>
      )}
      {isMoreOpen && (
        <div className="counter-fives-more" dir="rtl">
          {rest.map((m) => mark(m))}
        </div>
      )}
    </div>
  );
}
