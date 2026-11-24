import { useEffect, useMemo, useState } from 'react';
import useSecurityLog from '../../hooks/useSecurityLog';
import { EVENT_LABEL, LEVELS, LEVEL_LABEL, uaDevice, summarize } from '../../utils/securityLogView';
import '../UpdatesNotebook/UpdatesNotebook.css';
import '../ErrorLog/ErrorLogScreen.css';
import './SecurityLogScreen.css';

const DAYS = [1, 7, 30, 90];
const PAGE = 150;
const timeText = (ts) => new Date(ts).toLocaleString('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function EventRow({ e }) {
  const device = uaDevice(e.ua);
  return (
    <li className={`seclog-row ${e.level}`}>
      <div className="seclog-row-top">
        <strong>{EVENT_LABEL[e.type] || e.type}</strong>
        <span className="seclog-time">{timeText(e.at)}</span>
      </div>
      <div className="seclog-row-who">
        {e.user ? <bdi dir="ltr">{e.user}</bdi> : 'بلا حساب'}
        {e.user && !e.verified && <span className="seclog-tag" title="الاسم مكتوب في الطلب ولم يثبت">غير متحقَّق</span>}
      </div>
      <div className="seclog-row-sub">
        {e.ip && <bdi dir="ltr">{e.ip}</bdi>}
        {device && <> · <bdi dir="ltr">{device}</bdi></>}
        {' · '}<bdi dir="ltr">{e.method} {e.path} → {e.status}</bdi>
      </div>
      {e.detail && <div className="seclog-row-sub"><bdi dir="ltr">{e.detail}</bdi></div>}
    </li>
  );
}

/**
 * «سجل الأمان» للمالك: ما حاوله الناس على الخادم (server/securityLog.js) — الطلبات المرفوضة
 * والأفعال الحسّاسة، لا الاستعمال العادي. الخادم يحذف ما مضى عليه ٩٠ يوماً، والمالك لا يمسحه.
 */
export default function SecurityLogScreen({ onClose, backRef }) {
  const [days, setDays] = useState(7);
  const [level, setLevel] = useState(null);   // null = الكل
  const [user, setUser] = useState('all');
  const [shownCount, setShownCount] = useState(PAGE);
  const log = useSecurityLog(days);
  const summary = useMemo(() => summarize(log.entries), [log.entries]);
  const shown = useMemo(() => log.entries.filter((e) => (!level || e.level === level) && (user === 'all' || (e.user || '') === user)), [log.entries, level, user]);

  useEffect(() => {
    if (!backRef) return undefined;
    backRef.current = onClose;
    return () => { if (backRef.current === onClose) backRef.current = null; };
  }, [backRef, onClose]);

  return (
    <div className="notebook-overlay" dir="rtl">
      <div className="notebook-card">
        <div className="notebook-head">
          <h2>سجل الأمان</h2>
          <button type="button" className="notebook-close" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>

        <div className="errorlog-days" role="radiogroup" aria-label="المدّة">
          {DAYS.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={d === days} className={`errorlog-chip${d === days ? ' active' : ''}`} onClick={() => { setDays(d); setShownCount(PAGE); }}>
              {d === 1 ? 'اليوم' : `${d} يوماً`}
            </button>
          ))}
        </div>

        <div className="seclog-tiles" role="group" aria-label="التصفية بالدرجة">
          {LEVELS.map((l) => (
            <button key={l} type="button" className={`seclog-tile ${l}${level === l ? ' active' : ''}`} aria-pressed={level === l} onClick={() => setLevel(level === l ? null : l)}>
              <b>{summary.levels[l] || 0}</b>
              <span>{LEVEL_LABEL[l]}</span>
            </button>
          ))}
        </div>

        {summary.users.length > 0 && (
          <label className="errorlog-filter">
            <span>الحساب</span>
            <select value={user} onChange={(e) => setUser(e.target.value)}>
              <option value="all">كل الحسابات ({summary.users.length})</option>
              {summary.users.map((u) => (
                <option key={u.user} value={u.user}>
                  {u.user || 'بلا حساب'} ({u.total}{u.alert ? ` · ${u.alert} تنبيه` : ''})
                </option>
              ))}
            </select>
          </label>
        )}

        {log.status === 'loading' && <p className="errorlog-empty" role="status">جارٍ التحميل…</p>}
        {log.status === 'error' && (
          <p className="errorlog-empty" role="alert">
            تعذّر الوصول إلى الخادم. <button type="button" className="notebook-btn" onClick={log.reload}>أعد المحاولة</button>
          </p>
        )}
        {log.status === 'ok' && shown.length === 0 && <p className="errorlog-empty">لا أحداث هنا ✓</p>}
        {log.status === 'ok' && shown.length > 0 && (
          <ul className="seclog-list">{shown.slice(0, shownCount).map((e, i) => <EventRow key={`${e.at}-${i}`} e={e} />)}</ul>
        )}
        {shown.length > shownCount && (
          <div className="errorlog-actions">
            <button type="button" className="notebook-btn" onClick={() => setShownCount((n) => n + PAGE)}>اعرض المزيد ({shown.length - shownCount})</button>
          </div>
        )}
        <div className="errorlog-actions">
          <button type="button" className="notebook-btn" onClick={log.reload}>تحديث</button>
        </div>
        <p className="errorlog-empty seclog-note">يُسجَّل المرفوض والحسّاس فقط، لا الاستعمال العادي ولا كلمات السر. يُحذف بعد ٩٠ يوماً.</p>
      </div>
    </div>
  );
}
