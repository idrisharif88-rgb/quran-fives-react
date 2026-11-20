import { useEffect, useRef, useState } from 'react';
import './CounterSectionArrows.css';

const NAME_MS = 1400;

/**
 * التنقّل بين أقسام العدّاد (اختيار المالك): سهمان مصمتان رأسيّان على جانبي الدائرة، بشكل سهم
 * تبديل البطاقة (VerseStyleGrip) مُداراً. الأيسر = القسم التالي، والأيمن = السابق، ويظهر اسم القسم
 * لحظةً بعد التبديل. لا يظهران إلا مع قسمين فأكثر.
 */
export default function CounterSectionArrows({ counters, activeId, onSelect }) {
  const [shownName, setShownName] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (counters.length < 2) return null;
  const index = Math.max(0, counters.findIndex((c) => c.id === activeId));

  const go = (step) => {
    const next = counters[(index + step + counters.length) % counters.length];
    onSelect(next.id);
    setShownName(next.name || 'العداد');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShownName(null), NAME_MS);
  };

  return (
    <>
      <button type="button" className="counter-section-arrow is-left" onClick={() => go(1)} aria-label="القسم التالي" title="القسم التالي">
        <svg viewBox="0 0 16 44" width="16" height="44" aria-hidden="true">
          <path d="M13 5 L3 22 L13 39 Z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      </button>
      <button type="button" className="counter-section-arrow is-right" onClick={() => go(-1)} aria-label="القسم السابق" title="القسم السابق">
        <svg viewBox="0 0 16 44" width="16" height="44" aria-hidden="true">
          <path d="M3 5 L13 22 L3 39 Z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      </button>
      {shownName && <div className="counter-section-name" role="status">{shownName}</div>}
    </>
  );
}
