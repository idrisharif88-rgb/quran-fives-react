import './CounterSectionArrows.css';

/**
 * التنقّل بين أقسام العدّاد (اختيار المالك): سهمان مصمتان رأسيّان على جانبي الدائرة، بشكل سهم
 * تبديل البطاقة (VerseStyleGrip) مُداراً. الأيسر = القسم التالي، والأيمن = السابق، واسم القسم يظهر
 * بعد التبديل في CounterSectionName. لا يظهران إلا مع قسمين فأكثر.
 */
export default function CounterSectionArrows({ counters, activeId, onSelect }) {
  if (counters.length < 2) return null;
  const index = Math.max(0, counters.findIndex((c) => c.id === activeId));

  const go = (step) => {
    const next = counters[(index + step + counters.length) % counters.length];
    onSelect(next.id);
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
    </>
  );
}
