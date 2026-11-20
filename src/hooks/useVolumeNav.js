import { useEffect, useRef } from 'react';

/**
 * أزرار الصوت في أندرويد تقلّب الصفحات: رفع = تقدّم، خفض = رجوع، والإمساك يكرّر.
 * MainActivity يأخذ الزرّين فقط ما دام enabled صحيحاً (setVolumeNav)؛ وإلا بقيا للصوت.
 * لا شيء في المتصفّح: الموقع لا يرى أزرار الصوت.
 */
export default function useVolumeNav(enabled, onNavigate) {
  const navigateRef = useRef(onNavigate);
  useEffect(() => { navigateRef.current = onNavigate; });

  useEffect(() => {
    const bridge = window.AndroidApp;
    if (!bridge?.setVolumeNav) return undefined;
    bridge.setVolumeNav(Boolean(enabled));
    if (!enabled) return undefined;
    const onKey = (e) => { if (e.dir === 'next' || e.dir === 'prev') navigateRef.current?.(e.dir); };
    window.addEventListener('volumeNav', onKey);
    return () => {
      window.removeEventListener('volumeNav', onKey);
      bridge.setVolumeNav(false);
    };
  }, [enabled]);
}
