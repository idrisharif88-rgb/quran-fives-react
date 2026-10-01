import { useEffect, useRef, useState } from 'react';
import { formatTotal, formatLap } from '../hooks/useStopwatch';
import './LapSheet.css';

const LapSheet = ({ laps, juzTimes, onClose, onSave, onSharePdf }) => {
  const touchStartRef = useRef(null);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef(null);

  // إجمالي تراكمي لكل جولة
  const rows = laps.map((l, i) => ({
    ...l,
    cumulativeMs: laps.slice(0, i + 1).reduce((s, x) => s + x.ms, 0),
  }));

  const totalLapMs = rows.length ? rows[rows.length - 1].cumulativeMs : 0;
  const avgMs = rows.length ? totalLapMs / rows.length : 0;
  const slowest = rows.length ? rows.reduce((a, b) => (b.ms > a.ms ? b : a)) : null;
  const hasData = rows.length > 0;

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  const handleSave = () => {
    if (onSave) onSave();
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2200);
  };

  const handleTouchStart = (e) => {
    const t = e.touches?.[0];
    if (t) touchStartRef.current = { y: t.clientY };
  };

  const handleTouchEnd = (e) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    // سحب للأسفل يغلق الورقة
    if (t.clientY - start.y > 80) onClose();
  };

  return (
    <div className="lap-sheet-overlay" onMouseDown={onClose}>
      <div
        className="lap-sheet"
        dir="rtl"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="lap-sheet-handle" />

        <div className="lap-sheet-head">
          <h2 className="lap-sheet-title">الجولات</h2>
          <button type="button" className="lap-sheet-close" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </div>

        <div className="lap-sheet-stats">
          <div className="lap-sheet-stat">
            <span>متوسط الصفحة</span>
            <strong>{formatLap(avgMs)}</strong>
          </div>
          <div className="lap-sheet-stat">
            <span>أبطأ صفحة</span>
            <strong>{slowest ? `${slowest.page} · ${formatLap(slowest.ms)}` : '—'}</strong>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="lap-sheet-empty">لا توجد جولات بعد في هذه الجلسة</p>
        ) : (
          <div className="lap-sheet-scroll">
            <div className="lap-sheet-cards">
              {rows.map((r, i) => (
                <div className="lap-sheet-card" key={i}>
                  <span className="lap-sheet-card-page">صفحة {r.page}</span>
                  <span className="lap-sheet-card-time">{formatLap(r.ms)}</span>
                  <span className="lap-sheet-card-total">{formatTotal(r.cumulativeMs)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {juzTimes.length > 0 && (
          <div className="lap-sheet-juz">
            <h3>أجزاء مكتملة</h3>
            {juzTimes.map((j) => (
              <div className="lap-sheet-juz-row" key={j.juz}>
                <span>الجزء {j.juz}</span>
                <strong>{formatTotal(j.ms)}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="lap-sheet-actions">
          <button
            type="button"
            className="lap-sheet-action-btn save"
            onClick={handleSave}
            disabled={!hasData}
          >
            {saved ? 'تم الحفظ ✓' : 'حفظ'}
          </button>
          <button
            type="button"
            className="lap-sheet-action-btn share"
            onClick={onSharePdf}
            disabled={!hasData}
          >
            مشاركة كـ PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default LapSheet;
