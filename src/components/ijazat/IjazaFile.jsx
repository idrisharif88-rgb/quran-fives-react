import { useEffect, useRef, useState } from 'react';
import { attachIjazaFile, removeIjazaFile, openIjazaFile, loadIjazaFiles, syncIjazaFile, MAX_FILE_BYTES } from '../../utils/ijazaFileStore';

/**
 * ملف الإجازة (PDF) المرفق بها: إرفاق، عرض، استبدال، إزالة. يُحفظ على السيرفر ونسخة على الجهاز.
 */
export default function IjazaFile({ ijazaId }) {
  const [info, setInfo] = useState(() => loadIjazaFiles()[ijazaId] || null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
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
    run(async () => setInfo(await attachIjazaFile(ijazaId, file)));
  };

  const pick = () => inputRef.current?.click();

  return (
    <div className="ijaza-file">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={onPick} />
      {info ? (
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
              onClick={() => (confirmRemove
                ? run(async () => { await removeIjazaFile(ijazaId); setInfo(null); setConfirmRemove(false); })
                : setConfirmRemove(true))}
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
