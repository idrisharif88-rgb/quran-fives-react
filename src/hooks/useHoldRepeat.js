import { useCallback, useEffect, useRef } from 'react';
import { LONG_PRESS_MS, repeatDelay } from '../utils/pageNav';

/**
 * زرّ يعمل بالضغط ويتكرّر ما دام ممسوكاً (دائرة العدّاد و«−»): خطوة فور الضغط، ثم بعد
 * LONG_PRESS_MS يتكرّر ويتسارع (repeatDelay) حتى يُرفع الإصبع. يُعيد خصائص تُفرد على الزرّ.
 * enabled=false: خطوة واحدة بلا تكرار (الضغط المطوّل مطفأ في الإعدادات).
 */
export default function useHoldRepeat(action, enabled = true) {
  const actionRef = useRef(action);
  useEffect(() => { actionRef.current = action; });
  const timer = useRef(null);

  const stop = useCallback(() => { clearTimeout(timer.current); timer.current = null; }, []);
  useEffect(() => stop, [stop]);

  const onPointerDown = useCallback((e) => {
    if (e.isPrimary === false) return;
    stop();
    actionRef.current?.();
    if (!enabled) return;
    const tick = (step) => {
      actionRef.current?.();
      timer.current = setTimeout(() => tick(step + 1), repeatDelay(step + 1));
    };
    timer.current = setTimeout(() => tick(0), LONG_PRESS_MS);
  }, [enabled, stop]);

  // لوحة مفاتيح أو قارئ شاشة: «نقرة» بلا مؤشّر (detail === 0)
  const onClick = useCallback((e) => { if (e.detail === 0) actionRef.current?.(); }, []);

  return { onPointerDown, onPointerUp: stop, onPointerCancel: stop, onPointerLeave: stop, onClick, onContextMenu: (e) => e.preventDefault() };
}
