import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * تشغيل تسجيل محفوظ في مكانه (قائمة «تسجيلاتي») بلا صفحة مصحف: مقطع واحد في كل لحظة.
 * @param loadUrl يحمّل ملف التسجيل ويعيد رابطاً مؤقتاً لتشغيله
 * @returns { playingId, failedId, toggle(recording), stop }
 */
export default function useRecordingPlayer(loadUrl) {
  const [playingId, setPlayingId] = useState(null);
  const [failedId, setFailedId] = useState(null);
  const currentRef = useRef(null);   // { id, audio, url }

  const stop = useCallback(() => {
    const current = currentRef.current;
    currentRef.current = null;
    if (current?.audio) current.audio.pause();
    if (current?.url) URL.revokeObjectURL(current.url);
    setPlayingId(null);
  }, []);

  // إغلاق الشاشة يوقف التشغيل ويحرّر الرابط
  useEffect(() => stop, [stop]);

  const toggle = useCallback(async (recording) => {
    const wasPlaying = currentRef.current?.id === recording.id;
    stop();
    if (wasPlaying) return;
    const current = { id: recording.id, audio: null, url: null };
    currentRef.current = current;
    setFailedId(null);
    setPlayingId(recording.id);
    const fail = () => { if (currentRef.current === current) { stop(); setFailedId(recording.id); } };
    try {
      const url = await loadUrl(recording);
      // أُوقف أو بُدّل المقطع أثناء التحميل
      if (currentRef.current !== current) { URL.revokeObjectURL(url); return; }
      current.url = url;
      current.audio = new Audio(url);
      current.audio.onended = () => { if (currentRef.current === current) stop(); };
      current.audio.onerror = fail;
      await current.audio.play();
    } catch {
      fail();
    }
  }, [loadUrl, stop]);

  return { playingId, failedId, toggle, stop };
}
