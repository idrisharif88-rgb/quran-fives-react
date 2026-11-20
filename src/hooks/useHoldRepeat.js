import { useCallback, useEffect, useRef } from 'react';
import { LONG_PRESS_MS } from '../utils/pageNav';

export const HOLD_REPEAT_MS = 250;

/**
 * زرّ يعمل بالضغط ويتكرّر ما دام ممسوكاً (دائرة العدّاد و«−»): خطوة فور الضغط، ثم بعد
 * LONG_PRESS_MS خطوة كل HOLD_REPEAT_MS حتى يُرفع الإصبع. يُعيد خصائص تُفرد على الزرّ.
 * enabled=false: خطوة واحدة بلا تكرار (الضغط المطوّل مطفأ في الإعدادات).
 */
export default function useHoldRepeat(action, enabled = true) {
  const actionRef = useRef(action);
  useEffect(() => { actionRef.current = action; });
  const timers = useRef({ wait: null, repeat: null });

  const stop = useCallback(() => {
    clearTimeout(timers.current.wait);
    clearInterval(timers.current.repeat);
    timers.current = { wait: null, repeat: null };
  }, []);

  useEffect(() => stop, [stop]);

  const onPointerDown = useCallback((e) => {
    if (e.isPrimary === false) return;
    stop();
    actionRef.current?.();
    if (!enabled) return;
    timers.current.wait = setTimeout(() => {
      timers.current.repeat = setInterval(() => actionRef.current?.(), HOLD_REPEAT_MS);
    }, LONG_PRESS_MS);
  }, [enabled, stop]);

  // لوحة مفاتيح أو قارئ شاشة: «نقرة» بلا مؤشّر (detail === 0)
  const onClick = useCallback((e) => { if (e.detail === 0) actionRef.current?.(); }, []);

  return { onPointerDown, onPointerUp: stop, onPointerCancel: stop, onPointerLeave: stop, onClick, onContextMenu: (e) => e.preventDefault() };
}
