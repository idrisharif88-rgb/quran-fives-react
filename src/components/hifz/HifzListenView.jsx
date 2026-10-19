import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import MushafPage from '../mushaf/MushafPage';
import { recordingRefs, verseKeys, pagesOfRefs } from '../../utils/hifzRecordingRefs';
import { recordingText } from './hifzText';
import usePlaybackRate, { applyRate } from '../../hooks/usePlaybackRate';
import PlaybackRateButton from './PlaybackRateButton';
import '../mushaf/MushafReader.css';
import './HifzRecorder.css';

const clock = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * الاستماع إلى تسجيل والعين على المصحف: صفحة المصحف الحقيقية التي فيها آيات التسجيل،
 * وهي كلّها مُبرَزة فيها (آية، أو ورد من 3 أو 5 أو 7)، وشريط تشغيل في الأسفل. يبدأ
 * التشغيل تلقائياً. ورد يمتدّ على صفحتين: يُتنقَّل بينهما بزرّين.
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
  const [pageAt, setPageAt] = useState(0);
  const speed = usePlaybackRate();

  // تغيير السرعة يسري فوراً على التشغيل الجاري
  useEffect(() => { applyRate(audioRef.current, speed.rate); }, [speed.rate, url]);

  const refs = recordingRefs(recording);
  const pages = pagesOfRefs(refs);
  const pageIndex = Math.min(pageAt, pages.length - 1);

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

  // سحب الشريط: لمسة أو سحب في أي مكان منه ينقل التشغيل إلى موضعه، للأمام أو للخلف
  const durationMs = Math.max(1, recording.durationMs);
  const seekTo = (ms) => {
    const next = Math.min(durationMs, Math.max(0, ms));
    if (audioRef.current) audioRef.current.currentTime = next / 1000;
    setPosition(next);
  };
  const seekAt = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * durationMs);
  };
  const onSeekDown = (e) => {
    if (!url) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekAt(e);
  };
  const onSeekMove = (e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) seekAt(e); };
  const onSeekKey = (e) => {
    if (e.key === 'ArrowRight') seekTo(position + 5000);
    else if (e.key === 'ArrowLeft') seekTo(position - 5000);
    else return;
    e.preventDefault();
  };
  const percent = Math.min(100, (position / durationMs) * 100);

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
          <strong>{recordingText(recording)}</strong>
          <span>{refs.length > 1 ? 'استمع وعينك على الآيات المظلَّلة' : 'استمع وعينك على الآية المظلَّلة'}</span>
        </div>
        <span className="hifz-header-spacer" />
      </div>

      <div className="hifz-listen-page app-unzoom" ref={pageRef}>
        {size.width > 0 && (
          <MushafPage
            page={pages[pageIndex]}
            width={size.width - 28}
            height={size.height - 12}
            highlightVerse={verseKeys(refs)}
          />
        )}
      </div>

      {pages.length > 1 && (
        <div className="hifz-listen-pages" dir="rtl">
          <button type="button" className="hifz-btn" onClick={() => setPageAt(pageIndex - 1)} disabled={pageIndex === 0}>الصفحة السابقة</button>
          <span>صفحة {pages[pageIndex]} — {pageIndex + 1} من {pages.length}</span>
          <button type="button" className="hifz-btn" onClick={() => setPageAt(pageIndex + 1)} disabled={pageIndex === pages.length - 1}>الصفحة التالية</button>
        </div>
      )}

      <div className="hifz-listen-bar" dir="ltr">
        <button type="button" className="hifz-listen-play" onClick={toggle} disabled={!url} aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}>
          {playing ? (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
        <div
          className="hifz-listen-seek"
          role="slider"
          tabIndex={0}
          aria-label="موضع التشغيل"
          aria-valuemin={0}
          aria-valuemax={Math.round(durationMs / 1000)}
          aria-valuenow={Math.round(position / 1000)}
          aria-valuetext={clock(position)}
          onPointerDown={onSeekDown}
          onPointerMove={onSeekMove}
          onKeyDown={onSeekKey}
        >
          <div className="hifz-listen-track">
            <div className="hifz-listen-progress" style={{ width: `${percent}%` }} />
          </div>
          <i className="hifz-listen-thumb" style={{ left: `${percent}%` }} />
        </div>
        <span className="hifz-listen-time">{clock(position)} / {clock(recording.durationMs)}</span>
        <PlaybackRateButton rate={speed.rate} onCycle={speed.cycle} />
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
          onLoadedMetadata={(e) => applyRate(e.currentTarget, speed.rate)}
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
