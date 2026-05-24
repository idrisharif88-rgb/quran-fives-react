import { useEffect, useState } from 'react';
import './SurahTransitionToast.css';

function playToastSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    // Two soft ascending tones — distinct from the nav click
    [
      { delay: 0,    freq: 520 },
      { delay: 0.22, freq: 780 },
    ].forEach(({ delay, freq }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.0001,  now + delay);
      gain.gain.exponentialRampToValueAtTime(0.28, now + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.25);
    });
  } catch { /* ignore */ }
}

export default function SurahTransitionToast({ toast }) {
  const [text, setText] = useState('');
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!toast?.id) return;
    setText(toast.message);
    setFading(false);
    playToastSound();

    const fadeTimer  = setTimeout(() => setFading(true), 2700);
    const clearTimer = setTimeout(() => setText(''),      3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [toast?.id]);

  if (!text) return null;

  return (
    <div className={`surah-transition-toast${fading ? ' surah-transition-toast--out' : ''}`}>
      {text}
    </div>
  );
}
