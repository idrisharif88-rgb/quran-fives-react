import { useEffect, useRef, useState } from 'react';
import { attachIjazaFile, removeIjazaFile, openIjazaFile, loadIjazaFiles, syncIjazaFile, MAX_FILE_BYTES } from '../../utils/ijazaFileStore';
import './IjazaFile.css';

/**
 * ملف الإجازة (PDF) المرفق بها: إرفاق، عرض، استبدال، إزالة. يُحفظ على السيرفر ونسخة على الجهاز.
 */
export default function IjazaFile({ ijazaId }) {
  const [info, setInfo] = useState(() => loadIjazaFiles()[ijazaId] || null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [progress, setProgress] = useState(null);   // 0..1 أثناء الإرفاق
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  // رفع ما لم يُرفع، أو إظهار ملف موجود على السيرفر فقط (جهاز جديد)
  useEffect(() => {
    let alive = true;
    syncIjazaFile(ijazaId).then((entry) => { if (alive) setInfo(entry); }).catch(() => {});
    return () => { alive = false; };
  }, [ijazaId]);

  const run = async (task) => {
    setBusy(true);
    setMessage('');
    try { await task(); } catch { setMessage('تعذّر ذلك، حاول مرة أخرى'); }
    setBusy(false);
  };

  const onPick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type && file.type !== 'application/pdf') { setMessage('اختر ملف PDF'); return; }
    if (file.size > MAX_FILE_BYTES) { setMessage('الملف أكبر من 50 ميغابايت'); return; }
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    setMessage('');
    attachIjazaFile(ijazaId, file, { onProgress: setProgress, signal: controller.signal })
      .then((entry) => setInfo(entry))
      .catch((e) => setMessage(e?.name === 'AbortError' ? 'أُلغي الرفع' : 'تعذّر ذلك، حاول مرة أخرى'))
      .finally(() => { abortRef.current = null; setProgress(null); });
  };

  const remove = async () => {
    setConfirmRemove(false);
    setInfo(null);
    await removeIjazaFile(ijazaId);
  };

  const pick = () => inputRef.current?.click();

  return (
    <div className="ijaza-file">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={onPick} />
      {progress !== null ? (
        <div className="ijaza-upload">
          <div className="ijaza-upload-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <bdi className="ijaza-upload-pct" dir="ltr">{Math.round(progress * 100)}%</bdi>
          <button type="button" className="ijaza-upload-cancel" onClick={() => abortRef.current?.abort()} aria-label="إلغاء الرفع">✕</button>
        </div>
      ) : info ? (
        <>
          <button type="button" className="ijaza-btn primary" onClick={() => run(() => openIjazaFile(ijazaId, info.name))} disabled={busy}>
            عرض ملف الإجازة
          </button>
          <span className="ijaza-file-name">{info.name}</span>
          {info.uploaded === false && <span className="ijaza-file-msg">على الجهاز فقط — يُرفع عند الاتصال</span>}
          <div className="ijaza-actions">
            <button type="button" className="ijaza-btn" onClick={pick} disabled={busy}>استبدال</button>
            <button
              type="button"
              className={`ijaza-btn ${confirmRemove ? 'danger' : ''}`.trim()}
              disabled={busy}
              onClick={() => (confirmRemove ? remove() : setConfirmRemove(true))}
            >
              {confirmRemove ? 'اضغط للتأكيد' : 'إزالة'}
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="ijaza-btn" onClick={pick} disabled={busy}>إرفاق ملف الإجازة (PDF)</button>
      )}
      {message && <span className="ijaza-file-msg" role="alert">{message}</span>}
    </div>
  );
}
