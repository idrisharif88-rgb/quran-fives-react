import { useState, useCallback, useEffect, useRef } from 'react';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

// صوت نافذة الطريقة: مقاطع مسجّلة تُشحن مع التطبيق (تعمل بلا إنترنت)، تُشغَّل متتالية.
// إن غاب مقطع أو تعذّر تشغيله نُطق النص بصوت الجهاز؛ وإن تعذّر هذا أيضاً فالرسالة مكتوبة.
const KEY = 'quran-fives-hifz-voice-v1';
const readOn = () => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } };

const CLIPS = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/voice/hifz/*.mp3', { eager: true, query: '?url', import: 'default' }))
    .map(([path, url]) => [path.split('/').pop().replace('.mp3', ''), url]),
);

const deviceSpeak = (text) => TextToSpeech.stop()
  .catch(() => {})
  .then(() => TextToSpeech.speak({ text, lang: 'ar-SA', rate: 0.95, pitch: 1.0, volume: 1.0, category: 'playback' }))
  .catch(() => {});

export default function useSpeech() {
  const [on, setOn] = useState(readOn);
  const audioRef = useRef(null);
  const runRef = useRef(0);   // كل رسالة جديدة تُبطل تتابع ما قبلها

  const stop = useCallback(() => {
    runRef.current += 1;
    audioRef.current?.pause();
    TextToSpeech.stop().catch(() => {});
  }, []);

  // message: { text, clips }
  const speak = useCallback((message) => {
    stop();
    if (!on || !message) return;
    const urls = message.clips.map((k) => CLIPS[k]);
    if (urls.some((u) => !u)) { deviceSpeak(message.text); return; }
    const run = runRef.current;
    const audio = audioRef.current || (audioRef.current = new Audio());
    const playAt = (i) => {
      if (run !== runRef.current || i >= urls.length) return;
      audio.onended = () => playAt(i + 1);
      audio.src = urls[i];
      audio.play().catch(() => { if (run === runRef.current) deviceSpeak(message.text); });
    };
    playAt(0);
  }, [on, stop]);

  const toggle = useCallback(() => {
    setOn((prev) => {
      const next = !prev;
      try { localStorage.setItem(KEY, next ? '1' : '0'); } catch { /* تجاهل */ }
      if (!next) stop();
      return next;
    });
  }, [stop]);

  // مغادرة الشاشة تقطع الكلام
  useEffect(() => stop, [stop]);

  return { on, speak, stop, toggle };
}
