import { useEffect, useMemo, useState } from 'react';
import useErrorLog from '../../hooks/useErrorLog';
import { groupErrors, devicesOf, deviceName } from '../../utils/errorLogView';
import '../UpdatesNotebook/UpdatesNotebook.css';
import './ErrorLogScreen.css';

const DAYS = [1, 7, 30, 90];
const KIND_LABEL = { crash: 'انهيار', promise: 'خطأ غير معالَج', sync: 'مزامنة', network: 'شبكة' };
const timeText = (ts) => new Date(ts).toLocaleString('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const PHONE = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="14" height="20" x="5" y="2" rx="2" /><path d="M12 18h.01" /></svg>;
const GLOBE = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>;

// سطر جهاز: أيقونته واسمه، وتحته الحساب والإصدار والمعرّف المختصر، وعلى الطرف العدد وآخر وقت
function DeviceLine({ device, onPick }) {
  const users = [...device.users];
  return (
    <li className="errorlog-device">
      <button type="button" className="errorlog-device-btn" onClick={onPick ? () => onPick(device.installId) : undefined} disabled={!onPick}>
        <span className="errorlog-device-icon">{device.platform === 'web' ? GLOBE : PHONE}</span>
        <span className="errorlog-device-text">
          <bdi className="errorlog-device-name" dir="ltr">{deviceName(device)}</bdi>
          <span className="errorlog-device-sub">
            {users.length ? <bdi>{users.join('، ')}</bdi> : 'بلا حساب'}
            {device.versions.size > 0 && <> · <bdi>{[...device.versions].join('، ')}</bdi></>}
            {' · '}<bdi dir="ltr">#{device.installId.slice(-6)}</bdi>
          </span>
        </span>
        <span className="errorlog-device-count"><b>{device.count}×</b><small>{timeText(device.last)}</small></span>
      </button>
    </li>
  );
}

function ErrorRow({ group, onPickDevice }) {
  const [open, setOpen] = useState(false);
  const s = group.sample;
  return (
    <li className="errorlog-row">
      <button type="button" className="errorlog-row-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={`errorlog-kind ${group.kind}`}>{KIND_LABEL[group.kind] || group.kind}</span>
        <span className="errorlog-msg" dir="ltr">{group.message}</span>
        <span className="errorlog-meta">
          <b>{group.count}×</b> · {group.devices.length === 1 ? <bdi dir="ltr">{deviceName(group.devices[0])}</bdi> : `${group.devices.length} أجهزة`} · {timeText(group.last)}
        </span>
      </button>
      {open && (
        <div className="errorlog-detail">
          <div>أوّل مرّة: {timeText(group.first)}{s.where && <> · الموضع: <bdi dir="ltr">{s.where}</bdi></>}</div>
          <ul className="errorlog-devices">
            {group.devices.map((d) => <DeviceLine key={d.installId} device={d} onPick={onPickDevice} />)}
          </ul>
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
  const [device, setDevice] = useState('all');   // installId أو 'all'
  const log = useErrorLog(days);
  const devices = useMemo(() => devicesOf(log.entries), [log.entries]);
  const shown = useMemo(() => (device === 'all' ? log.entries : log.entries.filter((e) => (e.installId || 'unknown') === device)), [log.entries, device]);
  const groups = useMemo(() => groupErrors(shown), [shown]);
  const picked = devices.find((d) => d.installId === device);

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

        {devices.length > 0 && (
          <label className="errorlog-filter">
            <span>الجهاز</span>
            <select value={picked ? device : 'all'} onChange={(e) => setDevice(e.target.value)}>
              <option value="all">كل الأجهزة ({devices.length})</option>
              {devices.map((d) => (
                <option key={d.installId} value={d.installId}>
                  {deviceName(d)}{d.users.size ? ` — ${[...d.users][0]}` : ''} ({d.count})
                </option>
              ))}
            </select>
          </label>
        )}
        {picked && <ul className="errorlog-devices errorlog-picked"><DeviceLine device={picked} /></ul>}

        {log.status === 'loading' && <p className="errorlog-empty" role="status">جارٍ التحميل…</p>}
        {log.status === 'error' && (
          <p className="errorlog-empty" role="alert">
            تعذّر الوصول إلى الخادم. <button type="button" className="notebook-btn" onClick={log.reload}>أعد المحاولة</button>
          </p>
        )}
        {log.status === 'ok' && groups.length === 0 && <p className="errorlog-empty">لا أخطاء في هذه المدّة ✓</p>}
        {log.status === 'ok' && groups.length > 0 && (
          <>
            <p className="errorlog-summary">{groups.length} خطأ مختلف · {shown.reduce((n, e) => n + (e.count || 1), 0)} مرّة{picked ? '' : ` · ${devices.length} جهاز`}</p>
            <ul className="errorlog-list">{groups.map((g) => <ErrorRow key={g.key} group={g} onPickDevice={picked ? undefined : setDevice} />)}</ul>
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
