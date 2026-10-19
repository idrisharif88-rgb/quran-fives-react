import { useState, useRef, useEffect, useCallback } from 'react';

// صيغة يدعمها المتصفّح للتسجيل (WebView أندرويد: webm/opus)
function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

// الميكروفون كما هو: مرشّحات المكالمات (إلغاء الصدى، كتم الضوضاء، ضبط الصوت تلقائياً) مُصمَّمة
// للمحادثة، وعلى أندرويد تحوّل المصدر إلى مصدر المكالمات بجودته المنخفضة — فكانت التلاوة مكتومة
// غير واضحة مقارنةً بتسجيل واتساب. أحادي القناة بـ64 kbps (Opus): واضح للصوت وحجمه معقول للرفع.
const MIC_CONSTRAINTS = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
};
const AUDIO_BITRATE = 64000;

/**
 * تسجيل صوتي من الميكروفون.
 * الإذن يطلبه النظام عند أول تسجيل (RECORD_AUDIO في AndroidManifest).
 * @param options.timeslice   يقسم التسجيل أجزاءً بهذا الطول (مللي ثانية) بدل جزء واحد عند الإيقاف
 * @param options.onData      يُستدعى بكل جزء (mimeType, chunk) — لحفظ مسوّدة أثناء التسجيل
 * @param options.onInterrupted يُستدعى بـ { blob, durationMs } إن أُغلقت الشاشة أثناء التسجيل؛ بدونه يُهمل التسجيل
 * @returns status: 'idle' | 'recording' | 'denied' | 'unsupported' | 'error'
 *          start(): يبدأ التسجيل — stop(): يوقفه ويعيد { blob, durationMs }
 */
export default function useRecorder(options = {}) {
  const [status, setStatus] = useState('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const startedAtRef = useRef(0);
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

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

  // إغلاق الشاشة أثناء التسجيل يحرّر الميكروفون، ويسلّم ما سُجّل لمن طلبه
  useEffect(() => () => {
    const recorder = recorderRef.current;
    const onInterrupted = optionsRef.current.onInterrupted;
    if (recorder && recorder.state !== 'inactive' && onInterrupted) {
      const startedAt = startedAtRef.current;
      recorder.onstop = () => {
        const blob = new Blob(recorder.chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0) onInterrupted({ blob, durationMs: Date.now() - startedAt });
      };
    }
    try { recorder?.stop(); } catch { /* متوقّف أصلاً */ }
    releaseStream();
  }, []);

  const start = useCallback(async () => {
    const mimeType = pickMimeType();
    if (mimeType === null || !navigator.mediaDevices?.getUserMedia) { setStatus('unsupported'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: AUDIO_BITRATE });
      recorder.chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        recorder.chunks.push(event.data);
        optionsRef.current.onData?.(recorder.mimeType, event.data);
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      recorder.start(optionsRef.current.timeslice);
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
