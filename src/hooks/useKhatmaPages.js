import { useCallback, useEffect, useState } from 'react';
import { loadStoredState, saveStoredState, LOCAL_SYNC_EVENT } from '../utils/persistence';
import { KHATMA_PAGES_KEY, normalizePages, markPage, unmarkPage } from '../utils/khatmaPages';

const load = () => normalizePages(loadStoredState(KHATMA_PAGES_KEY));

/**
 * الصفحات المنقورة في العدّادات (utils/khatmaPages). تُزامَن مع الحساب (SYNCED_LOCAL_KEYS)،
 * فتنزيل من السحابة يعيد القراءة.
 */
export default function useKhatmaPages() {
  const [pages, setPages] = useState(load);

  useEffect(() => {
    const reload = () => setPages(load());
    window.addEventListener(LOCAL_SYNC_EVENT, reload);
    return () => window.removeEventListener(LOCAL_SYNC_EVENT, reload);
  }, []);

  const apply = useCallback((change) => {
    const current = load();
    const next = change(current);
    if (next === current) return;
    saveStoredState(KHATMA_PAGES_KEY, next);
    setPages(next);
  }, []);

  const mark = useCallback((page) => apply((p) => markPage(p, page, Date.now())), [apply]);
  const unmark = useCallback((page) => apply((p) => unmarkPage(p, page)), [apply]);

  return { pages, mark, unmark };
}
