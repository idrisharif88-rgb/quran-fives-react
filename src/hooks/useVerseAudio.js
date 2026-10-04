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
 * تشغيل تلاوة آية أو آيات متتالية (ورد اليوم) بصوت مقرئ، واحدة بعد الأخرى.
 * @param verses     [{ s, a }] بترتيب التلاوة
 * @param onFinished يُستدعى عند انتهاء التلاوة كاملةً — بعد آخر آية (لا عند الإيقاف)
 * @returns { status: 'idle' | 'loading' | 'playing' | 'error', play, stop }
 */
export default function useVerseAudio({ verses, reciter, onFinished }) {
  const [status, setStatus] = useState('idle');
  const audioRef = useRef(null);
  const finishedRef = useRef(onFinished);
  const versesKey = verses.map((v) => `${v.s}:${v.a}`).join(',');

  useEffect(() => { finishedRef.current = onFinished; }, [onFinished]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setStatus('idle');
  }, []);

  // تغيّر الآيات أو إغلاق الشاشة يوقف التلاوة
  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null; }, [versesKey, reciter]);

  const play = useCallback(() => {
    audioRef.current?.pause();
    setStatus('loading');
    const queue = versesKey.split(',').map((key) => key.split(':').map(Number));

    // يشغّل الآية رقم position ثم التي بعدها؛ audioRef يحمل المشغّل الجاري وحده،
    // فأي تشغيل أحدث أو إيقاف يُبطل هذه السلسلة.
    const playAt = async (position) => {
      const [surah, ayah] = queue[position];
      const audio = new Audio();
      audioRef.current = audio;
      audio.onended = () => {
        if (audioRef.current !== audio) return;
        if (position + 1 < queue.length) { playAt(position + 1); return; }
        audioRef.current = null;
        setStatus('idle');
        finishedRef.current?.();
      };
      audio.onerror = () => { if (audioRef.current === audio) { audioRef.current = null; setStatus('error'); } };
      audio.onplaying = () => { if (audioRef.current === audio) setStatus('playing'); };
      audio.src = await resolveSource(getAudioUrl(surah, ayah, reciter));
      if (audioRef.current !== audio) return;
      audio.play().catch(() => { if (audioRef.current === audio) { audioRef.current = null; setStatus('error'); } });
    };
    playAt(0);
  }, [versesKey, reciter]);

  return { status, play, stop };
}
