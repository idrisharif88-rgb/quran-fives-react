import { useRef } from 'react';
import { formatTotal, formatLap, lapStatus } from '../hooks/useStopwatch';
import './StopwatchBar.css';

const StopwatchBar = ({
  totalMs,
  currentLapMs,
  isRunning,
  targetMs,
  onToggle,
  onReset,
  onOpenLapSheet,
}) => {
  const touchStartRef = useRef(null);
  const status = lapStatus(currentLapMs, targetMs);

  const handleTouchStart = (e) => {
    const t = e.touches?.[0];
    if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // سحب للأعلى يفتح ورقة الجولات
    if (dy < -50 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      onOpenLapSheet();
    }
  };

  return (
    <div
      className="stopwatch-bar"
      dir="ltr"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        className="stopwatch-side-btn"
        onClick={onReset}
        aria-label="إعادة"
        title="إعادة"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 5V2L7 7l5 5V8c2.97 0 5.44 2.16 5.91 5h2.02A8.004 8.004 0 0 0 12 5zm-5.91 6H4.07A8.004 8.004 0 0 0 12 19v3l5-5-5-5v3c-2.97 0-5.44-2.16-5.91-5z"/>
        </svg>
      </button>

      <div
        className="stopwatch-display"
        onClick={onOpenLapSheet}
        role="button"
        tabIndex={0}
        aria-label="فتح ورقة الجولات"
      >
        <div className="stopwatch-total">{formatTotal(totalMs)}</div>
        <div className={`stopwatch-lap ${status}`}>{formatLap(currentLapMs)}</div>
      </div>

      <button
        type="button"
        className={`stopwatch-side-btn ${isRunning ? 'running' : ''}`}
        onClick={onToggle}
        aria-label={isRunning ? 'إيقاف' : 'تشغيل'}
        title={isRunning ? 'إيقاف' : 'تشغيل'}
      >
        {isRunning ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>
    </div>
  );
};

export default StopwatchBar;
