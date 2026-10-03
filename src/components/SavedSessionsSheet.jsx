import { useState } from 'react';
import { formatSeconds } from '../utils/sessions';
import './SavedRunsSheet.css';
import './SavedSessionsSheet.css';

const SavedSessionsSheet = ({ sessions, onClose, onOpen, onDelete, formatDate }) => {
  // الحذف بضغطتين: الأولى تطلب التأكيد على الصفّ نفسه، والثانية تحذف
  const [confirming, setConfirming] = useState(null);

  const handleDelete = (session) => {
    if (confirming !== session) {
      setConfirming(session);
      return;
    }
    setConfirming(null);
    onDelete(session);
  };

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
              <div className="saved-session-row" key={i}>
                <button type="button" className="saved-session-main" onClick={() => onOpen(s)}>
                  <span className="saved-session-juz">الجزء {s.juzNumber}</span>
                  <span className="saved-session-sub">
                    <strong>{formatSeconds(s.totalSeconds)}</strong>
                    <span>{s.pageTimes.length} صفحة</span>
                    {formatDate && <span>{formatDate(s.finishedAt)}</span>}
                  </span>
                </button>
                <div className="saved-session-actions">
                  {confirming === s ? (
                    <>
                      <button type="button" className="saved-session-confirm" onClick={() => handleDelete(s)}>تأكيد الحذف</button>
                      <button type="button" className="saved-session-icon" onClick={() => setConfirming(null)} aria-label="إلغاء" title="إلغاء">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="saved-session-icon" onClick={() => onOpen(s)} aria-label="عرض" title="عرض">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 5C7 5 2.73 8.11 1 12.5 2.73 16.89 7 20 12 20s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>
                      </button>
                      <button type="button" className="saved-session-icon danger" onClick={() => handleDelete(s)} aria-label="حذف" title="حذف">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                      </button>
                    </>
                  )}
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
