import { useState, useEffect } from 'react';
import {
  formatSeconds,
  allTimeAverage,
  previousCardAverage,
} from '../utils/sessions';
import DuaEditor from './DuaEditor';
import PageTimesChart from './PageTimesChart';
import './JuzResults.css';

const JuzResults = ({ session, sessions, target, onSave, onDelete, onShare, onUpdateDua, onClose, backRef }) => {
  const [dua, setDua] = useState(session.dua || '');
  const [editing, setEditing] = useState(false);

  // زرّ الرجوع يغلق محرّر الدعاء أولاً ثم البطاقة — يُسجَّل الإغلاق ما دام المحرّر مفتوحاً
  useEffect(() => {
    if (!backRef || !editing) return undefined;
    backRef.current = () => setEditing(false);
    return () => { backRef.current = null; };
  }, [backRef, editing]);

  const prev = previousCardAverage(sessions, session.startPage);
  const all = allTimeAverage(sessions);

  const compareParts = [];
  if (prev != null) {
    compareParts.push(session.avgSeconds < prev ? 'أسرع من البطاقة السابقة' : 'أبطأ من البطاقة السابقة');
  }
  if (all != null) {
    compareParts.push(session.avgSeconds < all ? 'أسرع من متوسطك العام' : 'أبطأ من متوسطك العام');
  }

  const saveDua = (text) => {
    setDua(text);
    onUpdateDua(text);
    setEditing(false);
  };

  return (
    <div className="jz-overlay" onMouseDown={onClose}>
      <div className="jz-card" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="jz-header">
          <div className="jz-juz">الجزء {session.juzNumber}</div>
          <div className="jz-range">{session.startPage} – {session.endPage}</div>
          <div className="jz-total">{formatSeconds(session.totalSeconds)}</div>
        </div>

        <div className="jz-stats">
          <div className="jz-stat"><span>المتوسط</span><strong>{formatSeconds(session.avgSeconds)}</strong></div>
          <div className="jz-stat"><span>أسرع صفحة</span><strong>{session.fastestPage.page} · {formatSeconds(session.fastestPage.seconds)}</strong></div>
          <div className="jz-stat"><span>أبطأ صفحة</span><strong>{session.slowestPage.page} · {formatSeconds(session.slowestPage.seconds)}</strong></div>
        </div>

        <PageTimesChart pageTimes={session.pageTimes} target={target} average={session.avgSeconds} />

        <div className="jz-best">
          {compareParts.length > 0 && <span className="jz-compare">{compareParts.join(' · ')}</span>}
        </div>

        <div className="jz-progress-line">
          <span>{session.juzNumber} من 30 جزء</span>
          <div className="jz-progress-bar">
            <div className="jz-progress-fill" style={{ width: `${Math.min(100, (session.juzNumber / 30) * 100)}%` }} />
          </div>
        </div>
        <div className="jz-dua">
          <div className="jz-dua-head">
            <span>دعاء</span>
            <button type="button" className="jz-dua-edit" onClick={() => setEditing(true)}>تعديل</button>
          </div>
          <p className="jz-dua-text">{dua || 'لا يوجد دعاء محفوظ'}</p>
        </div>

        <div className="jz-actions">
          <button type="button" className="jz-action" onClick={() => onSave(session)} title="حفظ">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
          </button>
          <button type="button" className="jz-action" onClick={() => onShare(session)} title="مشاركة">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
          </button>
          <button type="button" className="jz-action danger" onClick={() => onDelete(session)} title="حذف">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </div>
      {editing && <DuaEditor initialDua={dua} onSave={saveDua} onCancel={() => setEditing(false)} />}
    </div>
  );
};

export default JuzResults;

