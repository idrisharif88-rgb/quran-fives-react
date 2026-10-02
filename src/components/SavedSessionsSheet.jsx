import { formatSeconds } from '../utils/sessions';
import './SavedRunsSheet.css';

const SavedSessionsSheet = ({ sessions, onClose, onOpen, onDelete, formatDate }) => {
  return (
    <div className="saved-runs-overlay" onMouseDown={onClose}>
      <div className="saved-runs" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="saved-runs-handle" />
        <div className="saved-runs-head">
          <h2 className="saved-runs-title">الجلسات المحفوظة</h2>
          <button type="button" className="saved-runs-close" onClick={onClose} aria-label="إغلاق">×</button>
        </div>

        {sessions.length === 0 ? (
          <p className="saved-runs-empty">لا توجد جلسات محفوظة بعد</p>
        ) : (
          <div className="saved-runs-scroll">
            {sessions.map((s, i) => (
              <div className="saved-run-card" key={i}>
                <button type="button" className="saved-run-summary" onClick={() => onOpen(s)}>
                  <span className="saved-run-date">الجزء {s.juzNumber}{formatDate ? ' · ' + formatDate(s.finishedAt) : ''}</span>
                  <span className="saved-run-meta">
                    <strong>{formatSeconds(s.totalSeconds)}</strong>
                    <span>{s.pageTimes.length} صفحة</span>
                  </span>
                </button>
                <div className="saved-run-actions">
                  <button type="button" className="saved-run-btn share" onClick={() => onOpen(s)}>عرض</button>
                  <button type="button" className="saved-run-btn delete" onClick={() => onDelete(s)}>حذف</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedSessionsSheet;
