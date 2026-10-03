import { useState, useEffect } from 'react';
import { loadMushafPage } from '../utils/mushafEdition';

// بيانات صفحة واحدة: { status: 'loading' | 'ready' | 'error', data }
export default function useMushafPage(page) {
  const [state, setState] = useState({ page, status: 'loading', data: null });

  useEffect(() => {
    let cancelled = false;
    loadMushafPage(page)
      .then((data) => { if (!cancelled) setState({ page, status: 'ready', data }); })
      .catch(() => { if (!cancelled) setState({ page, status: 'error', data: null }); });
    return () => { cancelled = true; };
  }, [page]);

  // نتيجة صفحة سابقة لا تُعرض مكان الصفحة الحالية
  return state.page === page ? state : { page, status: 'loading', data: null };
}
