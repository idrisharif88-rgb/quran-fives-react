import { useEffect, useRef } from 'react';
import { LONG_PRESS_MS, directionAt, isNavTarget, movedTooFar, repeatDelay } from '../utils/pageNav';

/**
 * ضغط مطوّل على البطاقة أو العدّاد أو صفحة المصحف: يسار = تقدّم، يمين = رجوع، ويتكرّر
 * متسارعاً ما دام الإصبع ممسكاً.
 * النقرة التي تتبع الضغط المطوّل تُبتلع، فلا تفتح صفحة المصحف ملء الشاشة مثلاً.
 */
export default function useLongPressNav(enabled, onNavigate) {
  const navigateRef = useRef(onNavigate);
  useEffect(() => { navigateRef.current = onNavigate; });

  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    let start = null;
    let swallowUntil = 0;

    const cancel = () => { clearTimeout(timer); timer = null; start = null; };

    const onDown = (e) => {
      cancel();
      if (e.isPrimary === false || !isNavTarget(e.target)) return;
      start = { x: e.clientX, y: e.clientY };
      const dir = directionAt(e.clientX, window.innerWidth);
      const tick = (step) => {
        if (step === 0) navigator.vibrate?.(15);
        navigateRef.current?.(dir);
        timer = setTimeout(() => tick(step + 1), repeatDelay(step));
      };
      timer = setTimeout(() => {
        start = null;   // بعد بدء التكرار لا تلغيه حركة صغيرة للإصبع
        tick(0);
      }, LONG_PRESS_MS);
    };
    const onMove = (e) => { if (start && movedTooFar(start, { x: e.clientX, y: e.clientY })) cancel(); };
    const release = () => {
      if (timer && !start) swallowUntil = Date.now() + 800;   // كان يتكرّر: النقرة التالية ليست نقرة
      cancel();
    };
    const onClick = (e) => {
      if (Date.now() > swallowUntil) return;
      swallowUntil = 0;
      e.stopPropagation();
      e.preventDefault();
    };
    const onContextMenu = (e) => { if (isNavTarget(e.target)) e.preventDefault(); };

    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    return () => {
      cancel();
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', release, true);
      document.removeEventListener('pointercancel', release, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
    };
  }, [enabled]);
}
