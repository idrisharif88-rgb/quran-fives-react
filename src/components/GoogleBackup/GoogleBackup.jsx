import { useState } from 'react';
import { GOOGLE_ENABLED, linkedEmail, unlinkGoogle } from '../../utils/googleDrive';
import { backupNow, restoreBackup, remoteBackupInfo, lastBackupAt, DAY_MS } from '../../utils/googleBackup';
import './GoogleBackup.css';

const when = (ts) => new Date(ts).toLocaleString('ar', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });

const FAILURES = {
  401: 'انتهت صلاحية الربط — اضغط مرة أخرى',
  403: 'رفض جوجل الطلب — تحقّق من الصلاحية',
};
const failureText = (e) => FAILURES[e?.status] || (navigator.onLine === false ? 'لا اتصال بالإنترنت' : 'تعذّر الاتصال بجوجل');

/**
 * «نسخة في جوجل درايف»: ربط الحساب، نسخ الآن، استرجاع. يظهر لمن منحه المشرف الصلاحية.
 */
export default function GoogleBackup() {
  const [email, setEmail] = useState(linkedEmail);
  const [last, setLast] = useState(lastBackupAt);
  const [busy, setBusy] = useState(null);           // 'save' | 'restore' | null
  const [message, setMessage] = useState(null);     // { ok, text }
  const [confirmRestore, setConfirmRestore] = useState(null);   // { savedAt }
  const [openedAt] = useState(() => Date.now());   // «مضى أكثر من يوم» يُقاس من فتح اللوحة
  const [progress, setProgress] = useState(null);   // { done, total } لرفع الملفّات أو تنزيلها
  const onProgress = (done, total) => setProgress(total ? { done, total } : null);

  if (!GOOGLE_ENABLED) return null;

  const run = async (kind, task) => {
    setBusy(kind);
    setMessage(null);
    try {
      await task();
    } catch (e) {
      setMessage({ ok: false, text: failureText(e) });
    }
    setBusy(null);
    setProgress(null);
  };

  const save = () => run('save', async () => {
    const { savedAt, failed } = await backupNow({ interactive: true, onProgress });
    setEmail(linkedEmail());
    setLast(savedAt);
    setMessage(failed
      ? { ok: false, text: `حُفظت النسخة، وتعذّر رفع ${failed} من الملفّات — تُعاد في المرة التالية` }
      : { ok: true, text: 'حُفظت نسخة في جوجل درايف' });
  });

  const askRestore = () => run('restore', async () => {
    const info = await remoteBackupInfo();
    setEmail(linkedEmail());
    if (!info) { setMessage({ ok: false, text: 'لا نسخة في جوجل درايف بعد' }); return; }
    setConfirmRestore(info);
  });

  const restore = () => run('restore', async () => {
    setConfirmRestore(null);
    if (await restoreBackup(onProgress)) window.location.reload();
  });

  const unlink = async () => {
    await unlinkGoogle();
    setEmail(null);
    setMessage(null);
  };

  const stale = email && openedAt - last > DAY_MS;
  return (
    <div className="google-backup">
      <div className="google-backup-head">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M7.71 3.5 1.15 15l3.43 5.95L11.14 9.5 7.71 3.5zm1.71 0 6.57 11.4h6.86L16.28 3.5H9.42zM14.5 16.5H5.35l-1.92 3.36c.2.38.6.64 1.07.64h13.25l-3.25-4z" /></svg>
        <strong>نسخة في جوجل درايف</strong>
      </div>
      {email ? (
        <p className="google-backup-info">
          <bdi dir="ltr">{email}</bdi>
          <br />
          {last ? `آخر نسخة: ${when(last)}` : 'لم تُحفظ نسخة بعد'}
          {stale && <span className="google-backup-stale"> — مضى أكثر من يوم</span>}
        </p>
      ) : (
        <p className="google-backup-info">تُحفظ نسخة من بياناتك في جوجل درايف الخاص بك كل يوم، وتسترجعها متى شئت.</p>
      )}

      {confirmRestore ? (
        <div className="google-backup-confirm">
          <p>نسخة {when(confirmRestore.savedAt)} تحلّ محلّ بيانات هذا الجهاز. متابعة؟</p>
          <div className="google-backup-actions">
            <button type="button" className="google-backup-btn danger" onClick={restore}>استرجع</button>
            <button type="button" className="google-backup-btn" onClick={() => setConfirmRestore(null)}>تراجع</button>
          </div>
        </div>
      ) : (
        <div className="google-backup-actions">
          <button type="button" className="google-backup-btn primary" onClick={save} disabled={busy !== null}>
            {busy === 'save' ? `جارٍ الحفظ…${progress ? ` ${progress.done}/${progress.total}` : ''}` : email ? 'احفظ الآن' : 'اربط حساب جوجل'}
          </button>
          {email && (
            <button type="button" className="google-backup-btn" onClick={askRestore} disabled={busy !== null}>
              {busy === 'restore' ? `جارٍ…${progress ? ` ${progress.done}/${progress.total}` : ''}` : 'استرجع'}
            </button>
          )}
          {email && <button type="button" className="google-backup-link" onClick={unlink} disabled={busy !== null}>فكّ الربط</button>}
        </div>
      )}
      {message && <p className={`google-backup-msg${message.ok ? ' ok' : ''}`} role="status">{message.text}</p>}
    </div>
  );
}
