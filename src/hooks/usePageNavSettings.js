import { useCallback, useEffect, useState } from 'react';
import { PAGE_NAV_EVENT, loadPageNav, savePageNav } from '../utils/pageNav';

/** إعدادا التنقّل (الضغط المطوّل، أزرار الصوت). كل نسخة من الخطّاف تتبع التغيير. */
export default function usePageNavSettings() {
  const [settings, setSettings] = useState(loadPageNav);

  useEffect(() => {
    const reload = () => setSettings(loadPageNav());
    window.addEventListener(PAGE_NAV_EVENT, reload);
    return () => window.removeEventListener(PAGE_NAV_EVENT, reload);
  }, []);

  const toggle = useCallback((key) => savePageNav({ ...loadPageNav(), [key]: !loadPageNav()[key] }), []);

  return { ...settings, toggle };
}
