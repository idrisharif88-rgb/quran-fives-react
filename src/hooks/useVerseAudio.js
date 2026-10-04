import { useState, useRef, useEffect, useCallback } from 'react';
import { getAudioUrl } from '../utils/audioDownloader';

const CACHE_NAME = 'quran-audio-cache';

// مصدر الصوت: من الذاكرة المحلية إن وُجد، وإلا من الشبكة مع حفظه للمرات القادمة
async function resolveSource(url) {
  if (!('caches' in window)) return url;
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url);
    if (cached) return URL.createObjectURL(await cached.blob());
    fetch(url).then((res) => { if (res.ok) cache.put(url, res.clone()); }).catch(() => {});
  } catch { /* بلا ذاكرة محلية: تشغيل مباشر من الشبكة */ }
  return url;
}

/**
 * تشغيل تلاوة آية واحدة بصوت مقرئ.
 * @param onFinished يُستدعى عند انتهاء التلاوة كاملةً (لا عند الإيقاف)
 * @returns { status: 'idle' | 'loading' | 'playing' | 'error', play, stop }
 */
export default function useVerseAudio({ surah, ayah, reciter, onFinished }) {
  const [status, setStatus] = useState('idle');
  const audioRef = useRef(null);
  const finishedRef = useRef(onFinished);

  useEffect(() => { finishedRef.current = onFinished; }, [onFinished]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setStatus('idle');
  }, []);

  // تغيّر الآية أو إغلاق الشاشة يوقف التلاوة
  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null; }, [surah, ayah, reciter]);

  const play = useCallback(async () => {
    audioRef.current?.pause();
    setStatus('loading');
    const audio = new Audio();
    audioRef.current = audio;
    audio.onended = () => {
      if (audioRef.current !== audio) return;
      audioRef.current = null;
      setStatus('idle');
      finishedRef.current?.();
    };
    audio.onerror = () => { if (audioRef.current === audio) { audioRef.current = null; setStatus('error'); } };
    audio.onplaying = () => { if (audioRef.current === audio) setStatus('playing'); };
    audio.src = await resolveSource(getAudioUrl(surah, ayah, reciter));
    if (audioRef.current !== audio) return;
    audio.play().catch(() => { if (audioRef.current === audio) { audioRef.current = null; setStatus('error'); } });
  }, [surah, ayah, reciter]);

  return { status, play, stop };
}
