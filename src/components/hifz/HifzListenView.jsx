import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import MushafPage from '../mushaf/MushafPage';
import { pageOfVerse } from '../../utils/versePage';
import { surahName } from './hifzText';
import '../mushaf/MushafReader.css';
import './HifzRecorder.css';

const clock = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * الاستماع إلى تسجيل والعين على المصحف: صفحة المصحف الحقيقية التي فيها الآية، والآية
 * مُبرَزة فيها، وشريط تشغيل في الأسفل. يبدأ التشغيل تلقائياً.
 * @param recording  مدخل التسجيل من الفهرس
 * @param loadUrl    يحمّل ملف التسجيل ويعيد رابطاً لتشغيله
 * @param onVerdict  لتسجيل الآية الجارية: بعد سماعه حتى آخره يُسأل صاحبه، فيُستدعى بـ
 *                   'correct' (القراءة صحيحة) أو 'retry' (فيها خطأ، يعيد التسجيل).
 *                   بلا هذا المعامل الشاشةُ للاستماع فقط.
 */
export default function HifzListenView({ recording, loadUrl, onVerdict, onClose }) {
  const pageRef = useRef(null);
  const audioRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [finished, setFinished] = useState(false);

  useLayoutEffect(() => {
    const el = pageRef.current;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // تحميل الملف، وتحرير رابطه عند الإغلاق
  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    loadUrl(recording)
      .then((loaded) => { objectUrl = loaded; if (cancelled) URL.revokeObjectURL(loaded); else setUrl(loaded); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [recording, loadUrl]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setFailed(true));
    else audio.pause();
  };

  const handleEnded = () => {
    setPlaying(false);
    setFinished(true);
  };

  return (
    <div className="hifz-listen" dir="rtl">
      <div className="hifz-listen-head">
        <button type="button" className="hifz-close" onClick={onClose} aria-label="إغلاق">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <div className="hifz-listen-title">
          <strong>{surahName(recording.s)} {recording.a}</strong>
          <span>استمع وعينك على الآية المظلَّلة</span>
        </div>
        <span className="hifz-header-spacer" />
      </div>

      <div className="hifz-listen-page" ref={pageRef}>
        {size.width > 0 && (
          <MushafPage
            page={pageOfVerse(recording.s, recording.a)}
            width={size.width - 28}
            height={size.height - 12}
            highlightVerse={`${recording.s}:${recording.a}`}
          />
        )}
      </div>

      <div className="hifz-listen-bar" dir="ltr">
        <button type="button" className="hifz-listen-play" onClick={toggle} disabled={!url} aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}>
          {playing ? (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
        <div className="hifz-listen-track">
          <div className="hifz-listen-progress" style={{ width: `${Math.min(100, (position / Math.max(1, recording.durationMs)) * 100)}%` }} />
        </div>
        <span className="hifz-listen-time">{clock(position)} / {clock(recording.durationMs)}</span>
      </div>
      {failed && <p className="hifz-listen-note error" dir="rtl">تعذّر تشغيل التسجيل.</p>}
      {finished && !failed && !onVerdict && <p className="hifz-listen-note" dir="rtl">انتهى التسجيل.</p>}
      {finished && !failed && onVerdict && (
        <div className="hifz-verdict" dir="rtl">
          <p>هل قراءتك صحيحة بلا خطأ؟</p>
          <div className="hifz-verdict-actions">
            <button type="button" className="hifz-btn primary" onClick={() => onVerdict('correct')}>نعم، صحيحة</button>
            <button type="button" className="hifz-btn danger" onClick={() => onVerdict('retry')}>فيها خطأ — أعيد التسجيل</button>
          </div>
        </div>
      )}

      {url && (
        <audio
          ref={audioRef}
          src={url}
          autoPlay
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime * 1000)}
          onEnded={handleEnded}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
