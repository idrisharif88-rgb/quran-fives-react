import { useEffect, useMemo, useState } from 'react';
import useErrorLog from '../../hooks/useErrorLog';
import { createContext, useContext } from 'react';
import { groupErrors, devicesOf, deviceName, deviceModel } from '../../utils/errorLogView';
import '../UpdatesNotebook/UpdatesNotebook.css';
import './ErrorLogScreen.css';

const DAYS = [1, 7, 30, 90];
const KIND_LABEL = { crash: 'انهيار', promise: 'خطأ غير معالَج', sync: 'مزامنة', network: 'شبكة' };
const timeText = (ts) => new Date(ts).toLocaleString('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const PHONE = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="14" height="20" x="5" y="2" rx="2" /><path d="M12 18h.01" /></svg>;
const GLOBE = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>;

const PEN = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21.17 6.81a1 1 0 0 0-3.99-3.98L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" /><path d="m15 5 4 4" /></svg>;

// أسماء الأجهزة ودالّة التسمية، لكل سطر جهاز في الشاشة
const NamesContext = createContext({ names: {}, rename: () => {} });

function RenameForm({ device, onDone }) {
  const { names, rename } = useContext(NamesContext);
  const [value, setValue] = useState(names[device.installId] || '');
  const save = (e) => { e.preventDefault(); rename(device.installId, value); onDone(); };
  return (
    <form className="errorlog-rename" onSubmit={save}>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={deviceModel(device)} maxLength={40} dir="auto" autoFocus aria-label="اسم الجهاز" />
      <button type="submit" className="notebook-btn primary">حفظ</button>
      <button type="button" className="notebook-btn" onClick={onDone}>إلغاء</button>
    </form>
  );
}

// سطر جهاز: اسمه (أو طرازه)، وتحته الطراز إن سُمّي، والحساب والإصدار والمعرّف المختصر، وعلى الطرف العدد وآخر وقت
function DeviceLine({ device, onPick }) {
  const { names } = useContext(NamesContext);
  const [editing, setEditing] = useState(false);
  const users = [...device.users];
  const named = Boolean(names[device.installId]);
  if (editing) return <li className="errorlog-device"><RenameForm device={device} onDone={() => setEditing(false)} /></li>;
  return (
    <li className="errorlog-device">
      <button type="button" className="errorlog-device-btn" onClick={onPick ? () => onPick(device.installId) : undefined} disabled={!onPick}>
        <span className="errorlog-device-icon">{device.platform === 'web' ? GLOBE : PHONE}</span>
        <span className="errorlog-device-text">
          {named
            ? <bdi className="errorlog-device-name" dir="auto">{names[device.installId]}</bdi>
            : <bdi className="errorlog-device-name" dir="ltr">{deviceModel(device)}</bdi>}
          <span className="errorlog-device-sub">
            {named && <><bdi dir="ltr">{deviceModel(device)}</bdi> · </>}
            {users.length ? <bdi>{users.join('، ')}</bdi> : 'بلا حساب'}
            {device.versions.size > 0 && <> · <bdi>{[...device.versions].join('، ')}</bdi></>}
            {' · '}<bdi dir="ltr">#{device.installId.slice(-6)}</bdi>
          </span>
        </span>
        <span className="errorlog-device-count"><b>{device.count}×</b><small>{timeText(device.last)}</small></span>
      </button>
      <button type="button" className="errorlog-device-pen" onClick={() => setEditing(true)} aria-label="سمِّ هذا الجهاز" title="سمِّ هذا الجهاز">{PEN}</button>
    </li>
  );
}

function ErrorRow({ group, onPickDevice }) {
  const { names } = useContext(NamesContext);
  const [open, setOpen] = useState(false);
  const s = group.sample;
  return (
    <li className="errorlog-row">
      <button type="button" className="errorlog-row-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={`errorlog-kind ${group.kind}`}>{KIND_LABEL[group.kind] || group.kind}</span>
        <span className="errorlog-msg" dir="ltr">{group.message}</span>
        <span className="errorlog-meta">
          <b>{group.count}×</b> · {group.devices.length === 1 ? <bdi dir="auto">{deviceName(group.devices[0], names)}</bdi> : `${group.devices.length} أجهزة`} · {timeText(group.last)}
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
    <NamesContext.Provider value={{ names: log.names, rename: log.rename }}>
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
                  {deviceName(d, log.names)}{d.users.size ? ` — ${[...d.users][0]}` : ''} ({d.count})
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
    </NamesContext.Provider>
  );
}
