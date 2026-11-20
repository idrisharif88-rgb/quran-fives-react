import { useEffect, useRef } from 'react';
import { LONG_PRESS_MS, directionAt, isNavTarget, movedTooFar } from '../utils/pageNav';

/**
 * ضغط مطوّل على البطاقة أو العدّاد أو صفحة المصحف: يسار = تقدّم، يمين = رجوع.
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
      timer = setTimeout(() => {
        timer = null;
        start = null;
        swallowUntil = Date.now() + 800;
        navigator.vibrate?.(15);
        navigateRef.current?.(dir);
      }, LONG_PRESS_MS);
    };
    const onMove = (e) => { if (start && movedTooFar(start, { x: e.clientX, y: e.clientY })) cancel(); };
    const onClick = (e) => {
      if (Date.now() > swallowUntil) return;
      swallowUntil = 0;
      e.stopPropagation();
      e.preventDefault();
    };
    const onContextMenu = (e) => { if (isNavTarget(e.target)) e.preventDefault(); };

    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', cancel, true);
    document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    return () => {
      cancel();
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', cancel, true);
      document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
    };
  }, [enabled]);
}
