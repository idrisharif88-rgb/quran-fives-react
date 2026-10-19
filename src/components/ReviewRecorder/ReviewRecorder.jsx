import { useEffect, useRef, useState } from 'react';
import useRecorder from '../../hooks/useRecorder';
import useHifzRecordings from '../../hooks/useHifzRecordings';
import ReviewRecordingsSheet from './ReviewRecordingsSheet';
import { clock } from './reviewText';
import { startDraft, appendDraft, clearDraft, holdDraft, takeDraft } from '../../utils/recordingDraft';
import './ReviewRecorder.css';

const DRAFT_SLICE_MS = 1000;
const pageRange = (a, b) => ({ fromPage: Math.min(a, b), toPage: Math.max(a, b) });

const RECORDER_MESSAGES = {
  denied: 'اسمح للتطبيق باستعمال الميكروفون',
  unsupported: 'التسجيل غير متاح على هذا الجهاز',
  error: 'تعذّر بدء التسجيل',
};

/**
 * تسجيل المراجعة في العدّاد: زرّ ميكروفون يبدأ ويوقف، ويُحفظ التسجيل بمدى الصفحات من صفحة
 * البدء إلى صفحة الإيقاف. زرّ القائمة يفتح «تسجيلات المراجعة».
 * لا يضيع تسجيل: مغادرة الشاشة أثناءه تحفظه، وإغلاق التطبيق تبقى منه مسوّدة تُستعاد عند العودة.
 * @param page    الصفحة الجارية في العدّاد
 * @param backRef يضع فيه إغلاق القائمة ما دامت مفتوحة (زرّ الرجوع)
 */
export default function ReviewRecorder({ page, backRef }) {
  const recordings = useHifzRecordings('review');
  const [open, setOpen] = useState(false);
  const fromPageRef = useRef(page);
  const pageRef = useRef(page);
  const startedAtRef = useRef(0);
  useEffect(() => { pageRef.current = page; }, [page]);
  const { add } = recordings;

  const recorder = useRecorder({
    timeslice: DRAFT_SLICE_MS,
    onData: (mimeType, chunk) => appendDraft(chunk, { mimeType, toPage: pageRef.current, durationMs: Date.now() - startedAtRef.current }),
    onInterrupted: (take) => holdDraft(
      add(take.blob, { durationMs: take.durationMs, ...pageRange(fromPageRef.current, pageRef.current) }).then(clearDraft),
    ),
  });
  const recording = recorder.status === 'recording';

  // تسجيل قطعه إغلاق التطبيق: يُستعاد من المسوّدة. يُحفظ ولو أُغلقت الشاشة قبل انتهاء القراءة —
  // takeDraft يمسح المسوّدة، فإسقاطه هنا يُضيّعه
  useEffect(() => {
    takeDraft().then((draft) => {
      if (!draft) return;
      const { meta } = draft;
      add(draft.blob, { durationMs: meta.durationMs || 0, ...pageRange(meta.fromPage ?? 0, meta.toPage ?? meta.fromPage ?? 0) });
    });
  }, [add]);

  const toggle = async () => {
    if (!recording) {
      fromPageRef.current = page;
      startedAtRef.current = Date.now();
      await startDraft({ fromPage: page, toPage: page });
      recorder.start();
      return;
    }
    const take = await recorder.stop();
    if (!take) { clearDraft(); return; }
    await add(take.blob, { durationMs: take.durationMs, ...pageRange(fromPageRef.current, page) });
    clearDraft();
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
        <button type="button" className="review-recorder-list" onClick={() => setOpen(true)} aria-label="تسجيلات المراجعة" title="تسجيلاتي">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        </button>
      )}
      {message && <span className="review-recorder-msg" role="alert">{message}</span>}
      {open && <ReviewRecordingsSheet recordings={recordings} onClose={() => setOpen(false)} backRef={backRef} />}
    </div>
  );
}
