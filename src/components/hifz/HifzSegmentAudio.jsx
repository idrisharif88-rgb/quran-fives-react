import useVerseAudio from '../../hooks/useVerseAudio';

/**
 * تلاوة المقطع الجاري في «طريقة الخماسيات»: آية وحدها أو مع ما قبلها، بصوت المقرئ المختار.
 * ضغطة تشغّل وأخرى توقف. يُركَّب من جديد لكل مقطع (key) فيتوقّف ويعود زرّه إلى ▶ —
 * useVerseAudio يوقف الصوت عند تغيّر الآيات لكنه لا يعيد حالته.
 * @param onStart يُستدعى قبل التشغيل — لإسكات الرسالة المنطوقة
 */
export default function HifzSegmentAudio({ refs, reciter, onStart }) {
  const audio = useVerseAudio({ verses: refs, reciter });
  const busy = audio.status === 'playing' || audio.status === 'loading';
  const toggle = () => {
    if (busy) { audio.stop(); return; }
    onStart?.();
    audio.play();
  };

  return (
    <>
      <button
        type="button"
        className={`hifz-fives-icon hifz-fives-play ${busy ? 'on' : ''}`.trim()}
        onClick={toggle}
        aria-label={busy ? 'إيقاف التلاوة' : 'استمع إلى المقطع'}
        title={busy ? 'إيقاف' : 'استمع إلى المقطع'}
      >
        {audio.status === 'loading' ? (
          <span className="hifz-fives-spinner" aria-hidden="true" />
        ) : busy ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6 6h12v12H6z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      {audio.status === 'error' && <span className="hifz-fives-audio-error" role="alert">تعذّر التشغيل — تحقّق من الإنترنت</span>}
    </>
  );
}
