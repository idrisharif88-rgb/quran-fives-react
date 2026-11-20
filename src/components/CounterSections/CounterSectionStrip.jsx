import { useRef } from 'react';
import './CounterSectionStrip.css';

const SWIPE_PX = 40;

/**
 * التنقّل بين أقسام العدّاد من الشاشة نفسها (اختيار المالك B): اسم القسم بين سهمين،
 * وسحب على الاسم، ونقاط تبيّن عدد الأقسام. التالي إلى اليسار كما في المصحف.
 * قسم واحد: الاسم وحده بلا أسهم.
 */
export default function CounterSectionStrip({ counters, activeId, onSelect }) {
  const swipeStart = useRef(null);
  const index = Math.max(0, counters.findIndex((c) => c.id === activeId));
  const active = counters[index];
  const many = counters.length > 1;

  const go = (step) => {
    if (!many) return;
    const next = counters[(index + step + counters.length) % counters.length];
    onSelect(next.id);
  };

  const onTouchStart = (e) => { swipeStart.current = e.touches?.[0]?.clientX ?? null; };
  const onTouchEnd = (e) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    const end = e.changedTouches?.[0]?.clientX;
    if (start == null || end == null || Math.abs(end - start) < SWIPE_PX) return;
    // سحب إلى اليمين يكشف ما على اليسار: التالي
    go(end > start ? 1 : -1);
  };

  const limit = Number.isInteger(active?.limit) ? ` · الحد ${active.limit}` : '';

  return (
    <div className="counter-sections" data-own-press dir="rtl">
      <div className="counter-sections-strip" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {many && (
          <button type="button" className="counter-sections-arrow" onClick={() => go(-1)} aria-label="القسم السابق">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
        <div className="counter-sections-name" aria-live="polite">
          <b>{active?.name || 'العداد'}</b>
          <small>ص {active?.value ?? 0}{limit}</small>
        </div>
        {many && (
          <button type="button" className="counter-sections-arrow" onClick={() => go(1)} aria-label="القسم التالي">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
        )}
      </div>
      {many && (
        <div className="counter-sections-dots" aria-hidden="true">
          {counters.map((c) => <i key={c.id} className={c.id === active?.id ? 'is-active' : ''} />)}
        </div>
      )}
    </div>
  );
}
