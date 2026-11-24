import { useCallback, useEffect, useState } from 'react';
import { fetchErrorLog, setErrorLogEnabled, clearErrorLog } from '../utils/cloudSync';
import { flushErrors } from '../utils/errorLog';

/** بيانات شاشة «سجل الأخطاء»: الأخطاء لعدد أيام، وحالة الاستقبال، والمسح. */
export default function useErrorLog(days) {
  const [state, setState] = useState({ status: 'loading', entries: [], enabled: true });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      await flushErrors();   // ما في طابور هذا الجهاز يظهر في القائمة أيضاً
      const res = await fetchErrorLog(days);
      setState({ status: 'ok', entries: res.entries || [], enabled: res.enabled !== false });
    } catch {
      setState((s) => ({ ...s, status: 'error' }));
    }
  }, [days]);

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  const toggle = async () => {
    const next = !state.enabled;
    setState((s) => ({ ...s, enabled: next }));
    try { await setErrorLogEnabled(next); } catch { setState((s) => ({ ...s, enabled: !next })); }
  };

  const clear = async () => {
    try { await clearErrorLog(); setState((s) => ({ ...s, entries: [] })); } catch { setState((s) => ({ ...s, status: 'error' })); }
  };

  return { ...state, reload: load, toggle, clear };
}
