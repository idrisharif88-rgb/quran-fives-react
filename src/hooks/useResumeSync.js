import { useEffect, useRef } from 'react';

const MIN_GAP_MS = 30 * 1000;   // عودة سريعة متكرّرة (فتح الإشعارات مثلاً) لا تطلب الخادم كل مرّة

/**
 * عند العودة إلى التطبيق من الخلفية (WebView والموقع معاً: visibilitychange) يُستدعى onResume،
 * فيُجلب ما كتبه جهاز آخر وما منحه المالك من صلاحيات. الفتح الأول يتولّاه فحص الفتح نفسه.
 */
export default function useResumeSync(onResume) {
  const cb = useRef(onResume);
  const last = useRef(0);
  useEffect(() => { cb.current = onResume; }, [onResume]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - last.current < MIN_GAP_MS) return;
      last.current = Date.now();
      cb.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
}
