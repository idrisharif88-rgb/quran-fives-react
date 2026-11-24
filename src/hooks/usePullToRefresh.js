import { useEffect, useRef, useState } from 'react';

export const PULL_TRIGGER = 72;   // px: مسافة السحب التي تطلق التحديث
const PULL_MAX = 110;

// هل الصفحة (أو أيّ حاوية تحت الإصبع) ممرّرة إلى الأسفل؟ عندها السحب تمرير لا تحديث
function scrolledAway(target) {
  if (window.scrollY > 0) return true;
  for (let el = target; el && el !== document.body; el = el.parentElement) {
    if (el.scrollTop > 0) return true;
  }
  return false;
}

// النوافذ والقوائم فوق الشاشة لها سحبها الخاص
const insideOverlay = (target) => Boolean(target?.closest?.('[role="dialog"], .modal-dialog, .audio-settings-overlay'));

/**
 * السحب إلى الأسفل من أعلى الشاشة للتحديث، كما في التطبيقات الكبيرة. يتابع اللمس على الوثيقة كلّها
 * ما دام enabled، ويعيد { pull, busy }: مسافة السحب الآن (للمؤشّر) وهل التحديث جارٍ.
 * السحب الأفقي (تقليب الخماسيات) لا يُحتسب: يجب أن يغلب الاتجاه الرأسي.
 */
export default function usePullToRefresh(enabled, onRefresh) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef(null);
  const pullRef = useRef(0);   // آخر مسافة، يقرؤها touchend بلا الاعتماد على دالّة تحديث الحالة
  const cb = useRef(onRefresh);
  useEffect(() => { cb.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    if (!enabled || busy) return undefined;
    const onStart = (e) => {
      const t = e.touches[0];
      start.current = (e.touches.length === 1 && !insideOverlay(e.target) && !scrolledAway(e.target))
        ? { x: t.clientX, y: t.clientY } : null;
    };
    const onMove = (e) => {
      if (!start.current) return;
      const t = e.touches[0];
      const dy = t.clientY - start.current.y;
      const dx = Math.abs(t.clientX - start.current.x);
      if (dy <= 0 || dx * 1.5 > dy) { pullRef.current = 0; setPull(0); if (dx > 24) start.current = null; return; }
      pullRef.current = Math.min(PULL_MAX, dy * 0.55);
      setPull(pullRef.current);
    };
    const onEnd = () => {
      if (!start.current) return;
      start.current = null;
      const fire = pullRef.current >= PULL_TRIGGER;
      pullRef.current = 0;
      setPull(0);
      if (!fire) return;
      setBusy(true);
      Promise.resolve()
        .then(() => cb.current())
        .catch(() => {})
        .finally(() => setBusy(false));
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled, busy]);

  return { pull: enabled ? pull : 0, busy };
}
