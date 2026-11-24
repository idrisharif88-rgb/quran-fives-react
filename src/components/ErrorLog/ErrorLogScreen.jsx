import { useEffect, useMemo, useState } from 'react';
import useErrorLog from '../../hooks/useErrorLog';
import { groupErrors } from '../../utils/errorLogView';
import '../UpdatesNotebook/UpdatesNotebook.css';
import './ErrorLogScreen.css';

const DAYS = [1, 7, 30, 90];
const KIND_LABEL = { crash: 'انهيار', promise: 'خطأ غير معالَج', sync: 'مزامنة', network: 'شبكة' };
const timeText = (ts) => new Date(ts).toLocaleString('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function ErrorRow({ group }) {
  const [open, setOpen] = useState(false);
  const s = group.sample;
  return (
    <li className="errorlog-row">
      <button type="button" className="errorlog-row-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={`errorlog-kind ${group.kind}`}>{KIND_LABEL[group.kind] || group.kind}</span>
        <span className="errorlog-msg" dir="ltr">{group.message}</span>
        <span className="errorlog-meta">
          <b>{group.count}×</b> · {group.installs.size} جهاز · {timeText(group.last)}
        </span>
      </button>
      {open && (
        <div className="errorlog-detail">
          <div>الإصدار: <bdi>{[...group.versions].join('، ') || '—'}</bdi> · المنصّة: <bdi>{[...group.platforms].join('، ') || '—'}</bdi></div>
          <div>أوّل مرّة: {timeText(group.first)}</div>
          {group.users.size > 0 && <div>الحسابات: <bdi>{[...group.users].join('، ')}</bdi></div>}
          {s.where && <div>الموضع: <bdi dir="ltr">{s.where}</bdi></div>}
          {s.stack && <pre className="errorlog-stack" dir="ltr">{s.stack}</pre>}
        </div>
      )}
    </li>
  );
}

/**
 * «سجل الأخطاء» للمالك: ما أرسلته التطبيقات تلقائياً (errorLog.js)، مجمّعاً بالخطأ.
 * يوقف الاستقبال أو يشغّله، ويمسح السجلّ. الخادم يحذف ما مضى عليه ٩٠ يوماً.
 */
export default function ErrorLogScreen({ onClose, backRef }) {
  const [days, setDays] = useState(7);
  const [confirmClear, setConfirmClear] = useState(false);
  const log = useErrorLog(days);
  const groups = useMemo(() => groupErrors(log.entries), [log.entries]);

  useEffect(() => {
    if (!backRef) return undefined;
    backRef.current = onClose;
    return () => { if (backRef.current === onClose) backRef.current = null; };
  }, [backRef, onClose]);

  return (
    <div className="notebook-overlay" dir="rtl">
      <div className="notebook-card">
        <div className="notebook-head">
          <h2>سجل الأخطاء</h2>
          <button type="button" className="notebook-close" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>

        <div className="errorlog-bar">
          <div className="errorlog-days" role="radiogroup" aria-label="المدّة">
            {DAYS.map((d) => (
              <button key={d} type="button" role="radio" aria-checked={d === days} className={`errorlog-chip${d === days ? " active" : ""}`} onClick={() => setDays(d)}>
                {d === 1 ? 'اليوم' : `${d} يوماً`}
              </button>
            ))}
          </div>
          <label className="errorlog-switch">
            <input type="checkbox" checked={log.enabled} onChange={log.toggle} />
            <span>{log.enabled ? 'الاستقبال يعمل' : 'الاستقبال موقوف'}</span>
          </label>
        </div>

        {log.status === 'loading' && <p className="errorlog-empty" role="status">جارٍ التحميل…</p>}
        {log.status === 'error' && (
          <p className="errorlog-empty" role="alert">
            تعذّر الوصول إلى الخادم. <button type="button" className="notebook-btn" onClick={log.reload}>أعد المحاولة</button>
          </p>
        )}
        {log.status === 'ok' && groups.length === 0 && <p className="errorlog-empty">لا أخطاء في هذه المدّة ✓</p>}
        {log.status === 'ok' && groups.length > 0 && (
          <>
            <p className="errorlog-summary">{groups.length} خطأ مختلف · {log.entries.reduce((n, e) => n + (e.count || 1), 0)} مرّة</p>
            <ul className="errorlog-list">{groups.map((g) => <ErrorRow key={g.key} group={g} />)}</ul>
          </>
        )}

        <div className="errorlog-actions">
          <button type="button" className="notebook-btn" onClick={log.reload}>تحديث</button>
          <button type="button" className={`notebook-btn ${confirmClear ? 'danger' : ''}`.trim()} onClick={() => (confirmClear ? (log.clear(), setConfirmClear(false)) : setConfirmClear(true))}>
            {confirmClear ? 'اضغط للتأكيد: امسح الكلّ' : 'امسح السجلّ'}
          </button>
        </div>
      </div>
    </div>
  );
}
