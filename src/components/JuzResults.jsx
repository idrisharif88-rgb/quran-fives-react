import { formatSeconds, previousCard, compareWithPrevious, sameSession } from '../utils/sessions';
import PageTimesChart from './PageTimesChart';
import './JuzResults.css';

// بطاقة الجزء في العدّاد — هادئة (اختيار المالك 2026-10-25): الزمن والفرق عن البطاقة السابقة،
// ثلاثة أرقام، والمخطط. بلا دعاء ولا شريط تقدّم (الرأس يقول رقم الجزء).
const JuzResults = ({ session, sessions, target, onSave, onDelete, onShare, onClose }) => {
  // البطاقة نفسها تُحفظ في المحفوظات لحظة اكتمالها، فتُستثنى كي لا تُقارَن بنفسها
  const others = sessions.filter((s) => !sameSession(s, session));
  const delta = compareWithPrevious(session, previousCard(others, session.startPage));

  return (
    <div className="jz-overlay" onMouseDown={onClose}>
      <div className="jz-card" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="jz-header">
          <div className="jz-juz">الجزء {session.juzNumber}</div>
          <div className="jz-range">{session.startPage} – {session.endPage}</div>
          <div className="jz-total">{formatSeconds(session.totalSeconds)}</div>
          {delta && (
            <div className={`jz-delta${delta.faster === true ? ' is-faster' : delta.faster === false ? ' is-slower' : ''}`}>
              {delta.faster === true ? '▼ ' : delta.faster === false ? '▲ ' : ''}{delta.text}
            </div>
          )}
        </div>

        <div className="jz-stats">
          <div className="jz-stat"><span>المتوسط</span><strong>{formatSeconds(session.avgSeconds)}</strong></div>
          <div className="jz-stat"><span>أسرع صفحة</span><strong>{session.fastestPage.page} · {formatSeconds(session.fastestPage.seconds)}</strong></div>
          <div className="jz-stat"><span>أبطأ صفحة</span><strong>{session.slowestPage.page} · {formatSeconds(session.slowestPage.seconds)}</strong></div>
        </div>

        <PageTimesChart pageTimes={session.pageTimes} target={target} />

        <div className="jz-actions">
          <button type="button" className="jz-action" onClick={() => onShare(session)} title="مشاركة">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
          </button>
          <button type="button" className="jz-action" onClick={() => onSave(session)} title="حفظ">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
          </button>
          <button type="button" className="jz-action danger" onClick={() => onDelete(session)} title="حذف">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default JuzResults;
