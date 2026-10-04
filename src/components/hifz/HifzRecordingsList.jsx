import { useState } from 'react';
import useRecordingPlayer from '../../hooks/useRecordingPlayer';
import { recordingText } from './hifzText';

const clock = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const dateText = (timestamp) => new Date(timestamp).toLocaleDateString('ar', { day: 'numeric', month: 'long' });

// «تسجيلاتي»: كل التسجيلات المحفوظة، الأحدث أولاً، ولكلٍّ منها أيقونتان: استماع وحذف.
// الاستماع هنا تشغيل في مكانه بلا صفحة مصحف — صفحة المصحف لخطوة التسجيل وحدها،
// حيث يُسمع المقطع ثم يُحكم عليه.
export default function HifzRecordingsList({ recordings }) {
  const [open, setOpen] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const player = useRecordingPlayer(recordings.loadUrl);
  if (recordings.list.length === 0) return null;

  const remove = (recording) => {
    if (player.playingId === recording.id) player.stop();
    recordings.remove(recording);
    setRemovingId(null);
  };

  return (
    <section className="hifz-section">
      <button type="button" className="hifz-recordings-toggle" onClick={() => { if (open) player.stop(); setOpen((v) => !v); }} aria-expanded={open}>
        <span>تسجيلاتي ({recordings.list.length})</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="hifz-recordings">
          {[...recordings.list].reverse().map((recording) => (
            <li key={recording.id} className="hifz-recording">
              <div className="hifz-recording-info">
                <strong>{recordingText(recording)}</strong>
                <span>
                  {player.failedId === recording.id ? 'تعذّر تشغيل التسجيل' : player.playingId === recording.id ? 'جارٍ التشغيل…' : dateText(recording.createdAt)}
                  {' · '}<bdi dir="ltr">{clock(recording.durationMs)}</bdi>
                </span>
              </div>
              {removingId === recording.id ? (
                <>
                  <button type="button" className="hifz-btn danger" onClick={() => remove(recording)}>حذف؟</button>
                  <button type="button" className="hifz-btn" onClick={() => setRemovingId(null)}>لا</button>
                </>
              ) : (
                <>
                  {player.playingId === recording.id ? (
                    <button type="button" className="hifz-icon-btn" onClick={() => player.toggle(recording)} aria-label="إيقاف" title="إيقاف">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>
                    </button>
                  ) : (
                    <button type="button" className="hifz-icon-btn" onClick={() => player.toggle(recording)} aria-label="استماع" title="استماع">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                  )}
                  <button type="button" className="hifz-icon-btn danger" onClick={() => setRemovingId(recording.id)} aria-label="حذف" title="حذف">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
