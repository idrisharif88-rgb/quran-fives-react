import { useState, useRef, useEffect, useCallback } from 'react';

// صيغة يدعمها المتصفّح للتسجيل (WebView أندرويد: webm/opus)
function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

/**
 * تسجيل صوتي من الميكروفون.
 * الإذن يطلبه النظام عند أول تسجيل (RECORD_AUDIO في AndroidManifest).
 * @returns status: 'idle' | 'recording' | 'denied' | 'unsupported' | 'error'
 *          start(): يبدأ التسجيل — stop(): يوقفه ويعيد { blob, durationMs }
 */
export default function useRecorder() {
  const [status, setStatus] = useState('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const startedAtRef = useRef(0);

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // عدّاد الزمن أثناء التسجيل
  useEffect(() => {
    if (status !== 'recording') return undefined;
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 200);
    return () => clearInterval(timer);
  }, [status]);

  // إغلاق الشاشة أثناء التسجيل يحرّر الميكروفون
  useEffect(() => () => {
    try { recorderRef.current?.stop(); } catch { /* متوقّف أصلاً */ }
    releaseStream();
  }, []);

  const start = useCallback(async () => {
    const mimeType = pickMimeType();
    if (mimeType === null || !navigator.mediaDevices?.getUserMedia) { setStatus('unsupported'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) recorder.chunks.push(event.data); };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      recorder.start();
      setStatus('recording');
    } catch (err) {
      releaseStream();
      setStatus(err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'denied' : 'error');
    }
  }, []);

  const stop = useCallback(() => new Promise((resolve) => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') { resolve(null); return; }
    recorder.onstop = () => {
      const durationMs = Date.now() - startedAtRef.current;
      const blob = new Blob(recorder.chunks, { type: recorder.mimeType || 'audio/webm' });
      recorderRef.current = null;
      releaseStream();
      setStatus('idle');
      resolve(blob.size > 0 ? { blob, durationMs } : null);
    };
    recorder.stop();
  }), []);

  return { status, elapsedMs, start, stop };
}
