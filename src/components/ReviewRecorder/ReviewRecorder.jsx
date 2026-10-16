import { useRef, useState } from 'react';
import useRecorder from '../../hooks/useRecorder';
import useHifzRecordings from '../../hooks/useHifzRecordings';
import ReviewRecordingsSheet from './ReviewRecordingsSheet';
import { clock } from './reviewText';
import './ReviewRecorder.css';

const RECORDER_MESSAGES = {
  denied: 'اسمح للتطبيق باستعمال الميكروفون',
  unsupported: 'التسجيل غير متاح على هذا الجهاز',
  error: 'تعذّر بدء التسجيل',
};

/**
 * تسجيل المراجعة في العدّاد: زرّ ميكروفون يبدأ ويوقف، ويُحفظ التسجيل بمدى الصفحات من صفحة
 * البدء إلى صفحة الإيقاف. زرّ القائمة يفتح «تسجيلات المراجعة».
 * @param page    الصفحة الجارية في العدّاد
 * @param backRef يضع فيه إغلاق القائمة ما دامت مفتوحة (زرّ الرجوع)
 */
export default function ReviewRecorder({ page, backRef }) {
  const recorder = useRecorder();
  const recordings = useHifzRecordings('review');
  const [open, setOpen] = useState(false);
  const fromPageRef = useRef(page);
  const recording = recorder.status === 'recording';

  const toggle = async () => {
    if (!recording) {
      fromPageRef.current = page;
      recorder.start();
      return;
    }
    const take = await recorder.stop();
    if (!take) return;
    const fromPage = Math.min(fromPageRef.current, page);
    const toPage = Math.max(fromPageRef.current, page);
    recordings.add(take.blob, { durationMs: take.durationMs, fromPage, toPage });
  };

  const message = RECORDER_MESSAGES[recorder.status];
  return (
    <div className="review-recorder">
      <button
        type="button"
        className={`review-recorder-mic ${recording ? 'recording' : ''}`.trim()}
        onClick={toggle}
        aria-label={recording ? 'إيقاف تسجيل المراجعة' : 'تسجيل المراجعة'}
        title={recording ? 'إيقاف' : 'سجّل مراجعتك'}
      >
        {recording ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6 6h12v12H6z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" /></svg>
        )}
      </button>
      {recording && <bdi className="review-recorder-time" dir="ltr">{clock(recorder.elapsedMs)}</bdi>}
      {!recording && recordings.list.length > 0 && (
        <button type="button" className="review-recorder-list" onClick={() => setOpen(true)} aria-label="تسجيلات المراجعة">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" /></svg>
          <span>{recordings.list.length}</span>
        </button>
      )}
      {message && <span className="review-recorder-msg" role="alert">{message}</span>}
      {open && <ReviewRecordingsSheet recordings={recordings} onClose={() => setOpen(false)} backRef={backRef} />}
    </div>
  );
}
