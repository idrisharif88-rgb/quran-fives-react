import { useRef } from 'react';
import './VerseStyleGrip.css';

const DRAG_PX = 14;   // سحبة أقصر من هذا لمسة

/**
 * سهم عريض منخفض على خطّ البطاقة السفلي يبدّل شكلها: للأعلى ← المصحف المدني، للأسفل ← النصّ.
 * يتّجه السهم نحو الحركة المتاحة، واللمسة وحدها تبدّل أيضاً.
 */
export default function VerseStyleGrip({ style, onChange }) {
  const startY = useRef(null);
  const isMushaf = style === 'mushaf';
  const next = isMushaf ? 'text' : 'mushaf';
  const label = isMushaf ? 'اعرض الآيات نصّاً' : 'اعرض الآيات بخطّ المصحف المدني';

  const onPointerDown = (e) => {
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e) => {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current;
    startY.current = null;
    if (Math.abs(dy) < DRAG_PX) onChange(next);
    else if (dy < 0 && !isMushaf) onChange('mushaf');
    else if (dy > 0 && isMushaf) onChange('text');
  };

  return (
    <button
      type="button"
      className={`verse-style-grip${isMushaf ? ' is-mushaf' : ''}`}
      title={label}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { startY.current = null; }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(next); } }}
    >
      <svg viewBox="0 0 36 10" width="36" height="10" aria-hidden="true">
        <path d="M3 8 L18 2 L33 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
