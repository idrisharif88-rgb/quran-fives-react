import { useEffect, useState } from 'react';
import './SurahTransitionToast.css';

export default function SurahTransitionToast({ toast }) {
  const [text, setText] = useState('');
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!toast?.id) return;
    setText(toast.message);
    setFading(false);

    const fadeTimer  = setTimeout(() => setFading(true),  1100);
    const clearTimer = setTimeout(() => setText(''),       1600);

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
