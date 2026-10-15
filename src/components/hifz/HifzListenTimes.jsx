import { useState, useEffect, useRef } from 'react';
import { LISTEN_CHOICES } from '../../utils/hifzSchedule';
import './HifzListenTimes.css';

/**
 * عدد مرات السماع: خانة صغيرة بجانب زرّ التشغيل، تفتح بطاقة صغيرة فيها 3 و5 و7.
 * تُغلق بالاختيار، أو بلمسة خارجها، أو بزرّ الرجوع (backRef).
 */
export default function HifzListenTimes({ value, onChange, backRef }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const outside = (e) => { if (!boxRef.current?.contains(e.target)) close(); };
    document.addEventListener('pointerdown', outside);
    if (backRef) backRef.current = close;
    return () => {
      document.removeEventListener('pointerdown', outside);
      if (backRef?.current === close) backRef.current = null;
    };
  }, [open, backRef]);

  const choose = (n) => { setOpen(false); onChange(n); };

  return (
    <div className="hifz-times" ref={boxRef}>
      <button type="button" className={`hifz-times-btn ${open ? 'open' : ''}`.trim()} onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open} aria-label={`عدد مرات السماع: ${value}`}>
        <strong>{value}</strong>
        <span>مرات</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 10l5 5 5-5z" /></svg>
      </button>
      {open && (
        <div className="hifz-times-menu" role="listbox" aria-label="عدد مرات السماع">
          <div className="hifz-times-title">مرات السماع</div>
          {LISTEN_CHOICES.map((n) => (
            <button key={n} type="button" role="option" aria-selected={n === value} className={n === value ? 'selected' : ''} onClick={() => choose(n)}>
              <span>{n} مرات</span>
              {n === value && <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
