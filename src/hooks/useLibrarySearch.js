import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLibraryBooks, fetchLibraryGrouped, searchLibrary } from '../utils/libraryApi';
import { readRecent, rememberSearch } from '../utils/libraryRecent';

const DELAY = 400;   // انتظار بعد آخر حرف قبل الطلب
const PAGE = 20;

// المكتبة: الكتب وأقسامها، كلمة البحث، الكتب المختارة، طريقة البحث والترتيب،
// والنتائج مجمّعة حسب الكتاب — أو قائمة بصفحات إن اختير كتاب واحد
export default function useLibrarySearch() {
  const [catalog, setCatalog] = useState({ books: [], sections: [] });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [exact, setExact] = useState(false);
  const [order, setOrder] = useState('rank');
  const [grouped, setGrouped] = useState({ groups: [], counts: {} });
  const [list, setList] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [recent, setRecent] = useState(readRecent);
  const ctrlRef = useRef(null);
  const single = selected.length === 1;

  useEffect(() => {
    const ctrl = new AbortController();
    fetchLibraryBooks(ctrl.signal).then(setCatalog, (e) => { if (e.name !== 'AbortError') setError(e.kind); });
    return () => ctrl.abort();
  }, [attempt]);

  const run = useCallback(async (offset) => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const opts = { bookIds: selected, exact, order };
    setLoading(true);
    try {
      if (offset === 0) setGrouped(await fetchLibraryGrouped(query, opts, ctrl.signal));
      if (single) {
        const page = await searchLibrary(query, { ...opts, offset, limit: PAGE }, ctrl.signal);
        setList((prev) => (offset ? [...prev, ...page] : page));
        setHasMore(page.length === PAGE);
      }
      setError(null);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.kind);
    } finally {
      if (ctrlRef.current === ctrl) setLoading(false);
    }
  }, [query, selected, exact, order, single]);

  useEffect(() => {
    if (!query.trim()) {
      ctrlRef.current?.abort();
      setGrouped({ groups: [], counts: {} });
      setList([]);
      setLoading(false);
      return undefined;
    }
    const t = setTimeout(() => run(0), DELAY);
    return () => clearTimeout(t);
  }, [query, attempt, run]);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  const total = Object.entries(grouped.counts)
    .filter(([id]) => !selected.length || selected.includes(Number(id)))
    .reduce((sum, [, n]) => sum + n, 0);

  return {
    ...catalog, query, setQuery, selected, setSelected, exact, setExact, order, setOrder,
    groups: grouped.groups, counts: grouped.counts, total, list, single, hasMore, loading, error, recent,
    loadMore: () => run(list.length),
    remember: () => setRecent(rememberSearch(query)),
    retry: () => { setError(null); setAttempt((n) => n + 1); },
  };
}
