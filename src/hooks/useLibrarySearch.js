import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLibraryBooks, searchLibrary } from '../utils/libraryApi';

const DELAY = 400;   // انتظار بعد آخر حرف قبل الطلب
const PAGE = 20;

// البحث في المكتبة: الكتب، كلمة البحث، الكتاب المختار، النتائج وصفحاتها، والخطأ (kind)
export default function useLibrarySearch() {
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState('');
  const [bookId, setBookId] = useState(null);
  const [results, setResults] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const ctrlRef = useRef(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchLibraryBooks(ctrl.signal).then(setBooks, (e) => { if (e.name !== 'AbortError') setError(e.kind); });
    return () => ctrl.abort();
  }, [attempt]);

  const run = useCallback(async (offset) => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setLoading(true);
    try {
      const page = await searchLibrary(query, { bookId, offset, limit: PAGE }, ctrl.signal);
      setResults((prev) => (offset ? [...prev, ...page] : page));
      setHasMore(page.length === PAGE);
      setError(null);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.kind);
    } finally {
      if (ctrlRef.current === ctrl) setLoading(false);
    }
  }, [query, bookId]);

  useEffect(() => {
    if (!query.trim()) {
      ctrlRef.current?.abort();
      setResults([]);
      setHasMore(false);
      setLoading(false);
      return undefined;
    }
    const t = setTimeout(() => run(0), DELAY);
    return () => clearTimeout(t);
  }, [query, bookId, attempt, run]);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  return {
    books, query, setQuery, bookId, setBookId, results, hasMore, loading, error,
    loadMore: () => run(results.length),
    retry: () => { setError(null); setAttempt((n) => n + 1); },
  };
}
