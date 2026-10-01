import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const pad = (n) => String(n).padStart(2, '0');

// أدنى زمن لاعتبار الصفحة حقيقية: دونها تُهمل الجولة (لم تُقرأ فعلاً).
// هذا يتكفّل أيضاً بالصفحة الافتتاحية غير الموقّتة (00:00) فلا تُسجَّل.
const MIN_PAGE_MS = 5000;

// حالة اللون نسبةً إلى الهدف: أخضر < 80%، برتقالي 80%–100%، أحمر > الهدف
export function lapStatus(ms, targetMs) {
  if (!targetMs || targetMs <= 0) return 'green';
  if (ms < targetMs * 0.8) return 'green';
  if (ms <= targetMs) return 'orange';
  return 'red';
}

// تنسيق الإجمالي HH:MM:SS.CC (ساعات:دقائق:ثوانٍ.أجزاء المئة)
export function formatTotal(ms) {
  const t = Math.max(0, Math.floor(ms));
  const centis = Math.floor((t % 1000) / 10);
  const s = Math.floor(t / 1000) % 60;
  const m = Math.floor(t / 60000) % 60;
  const h = Math.floor(t / 3600000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(centis)}`;
}

// تنسيق زمن الجولة MM:SS.CC
export function formatLap(ms) {
  const t = Math.max(0, Math.floor(ms));
  const centis = Math.floor((t % 1000) / 10);
  const s = Math.floor(t / 1000) % 60;
  const m = Math.floor(t / 60000);
  return `${pad(m)}:${pad(s)}.${pad(centis)}`;
}

// تجميع الأجزاء المكتملة (كل 20 صفحة = جزء) من قائمة الجولات
function deriveJuzTimes(laps) {
  const totals = {};
  const counts = {};
  laps.forEach((l) => {
    if (!Number.isFinite(l.page) || l.page < 1) return;
    const j = Math.floor((l.page - 1) / 20) + 1;
    totals[j] = (totals[j] || 0) + l.ms;
    counts[j] = (counts[j] || 0) + 1;
  });
  return Object.keys(totals)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((j) => (counts[j] || 0) >= 20)
    .map((j) => ({ juz: j, ms: totals[j] }));
}

export default function useStopwatch({ onJuzComplete } = {}) {
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState([]);       // جولات مكتملة [{ page, ms }]
  const [currentLapMs, setCurrentLapMs] = useState(0); // زمن الجولة الحالية (بالمللي ثانية)
  const [carryMs, setCarryMs] = useState(0);           // زمن مُجمّد عند مغادرة العدّاد، يبقى ضمن الإجمالي

  const lapStartRef = useRef(null);           // performance.now() عند بدء الجولة الحالية
  const currentLapAccumRef = useRef(0);       // ما تراكم من الجولة قبل الإيقاف اليدوي
  const wakeLockRef = useRef(null);
  const onJuzCompleteRef = useRef(onJuzComplete);
  const seenJuzRef = useRef(new Set());

  useEffect(() => { onJuzCompleteRef.current = onJuzComplete; }, [onJuzComplete]);

  // إبقاء الشاشة مستيقظة أثناء الحفظ (Wake Lock API للويب).
  // Android (Capacitor): أدخِل هنا مكوّن @capacitor-community/keep-awake
  // (request()/release()) للنسخة المعبّأة بدل واجهة المتصفح أو بالإضافة إليها.
  const requestWakeLock = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      /* بعض المتصفحات لا تدعمها — نتجاهل */
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    try { wakeLockRef.current?.release?.(); } catch { /* تجاهل */ }
    wakeLockRef.current = null;
  }, []);

  // مغادرة الشاشة (سهم الرجوع/الرئيسية/زر الرجوع/فقدان التركيز):
  // إيقاف مؤقت + تصفير الجولة الحالية فقط — تبقى الجولات المحفوظة والإجمالي كما هما
  const leaveScreen = useCallback(() => {
    // جمّد زمن الجولة الحالية غير المكتملة في الإجمالي قبل تصفيرها، فلا ينقص الإجمالي عند المغادرة
    const nowMs = currentLapAccumRef.current
      + (lapStartRef.current != null ? performance.now() - lapStartRef.current : 0);
    setCarryMs(prev => prev + nowMs);
    lapStartRef.current = null;
    currentLapAccumRef.current = 0;
    setCurrentLapMs(0);
    setIsRunning(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  // زر الطرح: ارجع صفحة — أَسقِط زمن الصفحة الجارية (غير المكتملة) فقط،
  // وأبقِ الجولات المحفوظة، وأعد تشغيل الجولة الحالية من الصفر
  const resetCurrentLap = useCallback(() => {
    currentLapAccumRef.current = 0;
    lapStartRef.current = isRunning ? performance.now() : null;
    setCurrentLapMs(0);
  }, [isRunning]);

  // أثناء التشغيل نحدّث زمن الجولة كل ~33ms لظهور أجزاء المئة بسلاسة
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      if (lapStartRef.current != null) {
        setCurrentLapMs(currentLapAccumRef.current + (performance.now() - lapStartRef.current));
      }
    }, 33);
    return () => clearInterval(id);
  }, [isRunning]);

  // كشف الأجزاء الجديدة وإبلاغ الأفضل الشخصي (مرة واحدة لكل جزء)
  const juzTimes = useMemo(() => deriveJuzTimes(laps), [laps]);
  useEffect(() => {
    const seen = seenJuzRef.current;
    juzTimes.forEach((t) => {
      if (!seen.has(t.juz)) {
        seen.add(t.juz);
        onJuzCompleteRef.current?.({ juz: t.juz, ms: t.ms, avgPerPage: t.ms / 20 });
      }
    });
  }, [juzTimes]);

  // عند فقدان التركيز/الظهور (متصفح أو Capacitor في الخلفية):
  // إيقاف مؤقت + تصفير زمن الجولة الحالية فقط — تبقى الجولات السابقة والإجمالي كما هما.
  useEffect(() => {
    const onHide = () => leaveScreen();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') leaveScreen();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [leaveScreen]);

  // تحرير القفل عند إزالة المكوّن
  useEffect(() => () => {
    try { wakeLockRef.current?.release?.(); } catch { /* تجاهل */ }
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;
    lapStartRef.current = performance.now();
    setCurrentLapMs(currentLapAccumRef.current);
    setIsRunning(true);
    requestWakeLock();
  }, [isRunning, requestWakeLock]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    if (lapStartRef.current != null) {
      currentLapAccumRef.current += performance.now() - lapStartRef.current;
      lapStartRef.current = null;
    }
    setCurrentLapMs(currentLapAccumRef.current);
    setIsRunning(false);
    releaseWakeLock();
  }, [isRunning, releaseWakeLock]);

  const toggle = useCallback(() => {
    if (isRunning) pause();
    else start();
  }, [isRunning, pause, start]);

  const reset = useCallback(() => {
    setIsRunning(false);
    lapStartRef.current = null;
    currentLapAccumRef.current = 0;
    setCurrentLapMs(0);
    setCarryMs(0);
    setLaps([]);
    seenJuzRef.current = new Set();
    releaseWakeLock();
  }, [releaseWakeLock]);

  // تسجيل جولة لصفحة انتهى حفظها، ثم بدء جولة جديدة من الصفر
  const recordLap = useCallback((finishedPage) => {
    let ms = currentLapAccumRef.current;
    if (isRunning && lapStartRef.current != null) {
      ms += performance.now() - lapStartRef.current;
    }
    // الصفحات دون الحدّ الأدنى (وكذلك الصفحة الافتتاحية غير الموقّتة) لا تُسجَّل:
    // نُبقي الجولة الحالية تُصفَّر وتبدأ الصفحة التالية من الصفر، لكن لا نضيف جولة.
    if (ms >= MIN_PAGE_MS) {
      // إعادة قراءة صفحة تستبدل جولتها القديمة بدل إضافة جولة مكرّرة
      setLaps((prev) => {
        const idx = prev.findIndex((l) => l.page === finishedPage);
        if (idx === -1) return [...prev, { page: finishedPage, ms }];
        const next = prev.slice();
        next[idx] = { page: finishedPage, ms };
        return next;
      });
    }
    currentLapAccumRef.current = 0;
    lapStartRef.current = isRunning ? performance.now() : null;
    setCurrentLapMs(0);
  }, [isRunning]);

  // الإجمالي = مجموع الجولات المكتملة + الجولة الحالية
  const totalMs = laps.reduce((sum, l) => sum + l.ms, 0) + currentLapMs + carryMs;

  return {
    isRunning,
    laps,
    juzTimes,
    currentLapMs,
    totalMs,
    start,
    pause,
    toggle,
    reset,
    recordLap,
    resetCurrentLap,
    leaveScreen,
  };
}
