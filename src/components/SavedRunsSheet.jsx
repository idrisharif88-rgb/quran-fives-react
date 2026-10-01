import { useState } from 'react';
import { formatTotal, formatLap } from '../hooks/useStopwatch';
import './SavedRunsSheet.css';

const SavedRunsSheet = ({ runs, onClose, onDelete, onShare, formatDate }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  return (
    <div className="saved-runs-overlay" onMouseDown={onClose}>
      <div className="saved-runs" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="saved-runs-handle" />

        <div className="saved-runs-head">
          <h2 className="saved-runs-title">الجلسات المحفوظة</h2>
          <button type="button" className="saved-runs-close" onClick={onClose} aria-label="إغلاق">×</button>
        </div>

        {runs.length === 0 ? (
          <p className="saved-runs-empty">لا توجد جلسات محفوظة بعد</p>
        ) : (
          <div className="saved-runs-scroll">
            {runs.map((run, i) => {
              const expanded = expandedIndex === i;
              return (
                <div className="saved-run-card" key={i}>
                  <button
                    type="button"
                    className="saved-run-summary"
                    onClick={() => setExpandedIndex(expanded ? null : i)}
                  >
                    <span className="saved-run-date">{formatDate ? formatDate(run.savedAt) : String(run.savedAt)}</span>
                    <span className="saved-run-meta">
                      <strong>{formatTotal(run.totalMs)}</strong>
                      <span>{run.laps.length} صفحة</span>
                    </span>
                  </button>

                  {expanded && (
                    <div className="saved-run-detail">
                      {run.laps.map((l, j) => (
                        <div className="saved-run-page" key={j}>
                          <span>صفحة {l.page}</span>
                          <span>{formatLap(l.ms)}</span>
                        </div>
                      ))}
                      {run.juzTimes && run.juzTimes.map((jz) => (
                        <div className="saved-run-juz" key={jz.juz}>
                          <span>الجزء {jz.juz}</span>
                          <span>{formatTotal(jz.ms)}</span>
                        </div>
                      ))}
                      <div className="saved-run-actions">
                        <button type="button" className="saved-run-btn delete" onClick={() => onDelete(i)}>حذف</button>
                        <button type="button" className="saved-run-btn share" onClick={() => onShare(run)}>مشاركة كـ PDF</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedRunsSheet;
