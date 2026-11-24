import { useCallback, useEffect, useState } from 'react';
import { fetchSecurityLog } from '../utils/cloudSync';

/** بيانات شاشة «سجل الأمان»: أحداث الخادم لعدد أيام */
export default function useSecurityLog(days) {
  const [state, setState] = useState({ status: 'loading', entries: [], total: 0 });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const res = await fetchSecurityLog(days);
      setState({ status: 'ok', entries: res.entries || [], total: res.total || 0 });
    } catch {
      setState((s) => ({ ...s, status: 'error' }));
    }
  }, [days]);

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  return { ...state, reload: load };
}
