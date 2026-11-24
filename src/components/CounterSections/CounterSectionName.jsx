import { useEffect, useState } from 'react';
import './CounterSectionName.css';

const SHOW_MS = 3000;

// قطعة أحجية (Material «extension»، مملوءة): قسمٌ من الكلّ — اختيار المالك
const PuzzleIcon = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
    <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z" />
  </svg>
);

/**
 * اسم قسم العدّاد: أيقونة قطعة أحجية داخل الدائرة، تحت حافّتها وفوق الرقم. لمسها يُظهر اسم القسم
 * مكانها ثلاث ثوانٍ، وكذلك كل تبديل للقسم بالسهمين. لا تظهر إلا مع قسمين فأكثر.
 */
export default function CounterSectionName({ counters, activeId }) {
  // shown: رقم كل ظهور (0 = مخفيّ)، فيبدأ كل لمس أو تبديل ثلاث ثوانٍ جديدة
  const [shown, setShown] = useState(0);
  const [lastId, setLastId] = useState(activeId);
  if (lastId !== activeId) {   // تبديل القسم بالسهمين: يظهر الاسم (تحديث أثناء العرض، لا في effect)
    setLastId(activeId);
    setShown((n) => n + 1);
  }

  useEffect(() => {
    if (!shown) return undefined;
    const timer = setTimeout(() => setShown(0), SHOW_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  const flash = () => setShown((n) => n + 1);

  if (counters.length < 2) return null;
  const active = counters.find((c) => c.id === activeId) || counters[0];
  const name = active?.name || 'العداد';

  return shown ? (
    <button type="button" className="counter-section-name-pill" dir="rtl" onClick={() => setShown(0)} aria-live="polite">
      {name}
    </button>
  ) : (
    <button type="button" className="counter-section-name-icon" onClick={flash} aria-label={`اسم القسم: ${name}`} title="اسم القسم">
      <PuzzleIcon />
    </button>
  );
}
