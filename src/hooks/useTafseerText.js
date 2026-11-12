import { useEffect, useState } from 'react';
import { fetchTafseer } from '../utils/tafseerApi';

// ما جُلب في هذه الجلسة: العودة إلى آية رآها المستخدم لا تعيد الطلب
const cache = new Map();

/**
 * تفسير آية من كتاب: { status: 'loading' | 'ok' | 'error', text }.
 * تغيير الآية أو الكتاب يلغي الطلب الجاري. `retry` يعيد المحاولة بعد خطأ.
 */
export default function useTafseerText(ref, bookId) {
  const key = `${bookId}:${ref.s}:${ref.a}`;
  const [state, setState] = useState({ key: null, status: 'loading', text: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cache.has(key)) return undefined;
    const controller = new AbortController();
    fetchTafseer(ref, bookId, controller.signal)
      .then((text) => { cache.set(key, text); setState({ key, status: 'ok', text }); })
      .catch((error) => { if (error.name !== 'AbortError') setState({ key, status: 'error', text: '' }); });
    return () => controller.abort();
  // ref كائن جديد كل رسم؛ يكفي مفتاحه
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  if (cache.has(key)) return { status: 'ok', text: cache.get(key), retry: () => {} };
  const settled = state.key === key;
  return { status: settled ? state.status : 'loading', text: '', retry: () => { setState({ key: null, status: 'loading', text: '' }); setAttempt((n) => n + 1); } };
}
