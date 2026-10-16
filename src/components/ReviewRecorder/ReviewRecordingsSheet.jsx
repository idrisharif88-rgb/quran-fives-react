import { useEffect, useState } from 'react';
import useRecordingPlayer from '../../hooks/useRecordingPlayer';
import { ensureLocal } from '../../utils/hifzRecordingSync';
import { shareRecording } from '../../utils/recordingShare';
import { clock, dateText, pagesText, shareName } from './reviewText';

/**
 * «تسجيلات المراجعة»: الأحدث أولاً، ولكلٍّ منها استماع ومشاركة (إلى المُسمِّع) وحذف.
 * تُغلق بزرّ ✕ أو بلمسة خارجها أو بزرّ الرجوع (backRef).
 */
export default function ReviewRecordingsSheet({ recordings, onClose, backRef }) {
  const player = useRecordingPlayer(recordings.loadUrl);
  const [removingId, setRemovingId] = useState(null);
  const [sharingId, setSharingId] = useState(null);

  useEffect(() => {
    if (!backRef) return undefined;
    backRef.current = onClose;
    return () => { if (backRef.current === onClose) backRef.current = null; };
  }, [backRef, onClose]);

  const remove = (r) => {
    if (player.playingId === r.id) player.stop();
    recordings.remove(r);
    setRemovingId(null);
  };

  const share = async (r) => {
    setSharingId(r.id);
    try {
      await ensureLocal(r);
      await shareRecording(r, shareName(r));
    } catch {
      alert('تعذّرت المشاركة');
    }
    setSharingId(null);
  };

  return (
    <div className="review-sheet-overlay" onClick={onClose}>
      <div className="review-sheet" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="review-sheet-head">
          <h2>تسجيلات المراجعة</h2>
          <button type="button" className="review-sheet-close" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>
        {recordings.list.length === 0 && <p className="review-sheet-empty">لا تسجيلات</p>}
        <ul className="review-sheet-list">
          {[...recordings.list].reverse().map((r) => (
            <li key={r.id} className="review-sheet-item">
              <div className="review-sheet-info">
                <strong>{pagesText(r)}</strong>
                <span>
                  {player.failedId === r.id ? 'تعذّر التشغيل' : player.playingId === r.id ? 'جارٍ التشغيل…' : dateText(r.createdAt)}
                  {' · '}<bdi dir="ltr">{clock(r.durationMs)}</bdi>
                </span>
              </div>
              {removingId === r.id ? (
                <>
                  <button type="button" className="review-sheet-confirm danger" onClick={() => remove(r)}>حذف؟</button>
                  <button type="button" className="review-sheet-confirm" onClick={() => setRemovingId(null)}>لا</button>
                </>
              ) : (
                <>
                  <button type="button" className="review-sheet-icon" onClick={() => player.toggle(r)} aria-label={player.playingId === r.id ? 'إيقاف' : 'استماع'}>
                    {player.playingId === r.id
                      ? <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6 6h12v12H6z" /></svg>
                      : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
                  </button>
                  <button type="button" className="review-sheet-icon" onClick={() => share(r)} disabled={sharingId === r.id} aria-label="أرسل إلى المُسمِّع">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
                  </button>
                  <button type="button" className="review-sheet-icon danger" onClick={() => setRemovingId(r.id)} aria-label="حذف">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
