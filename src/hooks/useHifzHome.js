import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadStoredState, saveStoredState, LOCAL_SYNC_EVENT } from '../utils/persistence';
import { dayKey } from '../utils/hifzSchedule';
import {
  HIFZ_HOME_KEY, normalizeHome, tapZikr, addZikr, removeZikr,
  tapTasbeeh, zeroTasbeeh, pickTasbeeh, addTasbeeh, removeTasbeeh, setTafseerVerse,
} from '../utils/hifzHome';

const load = () => normalizeHome(loadStoredState(HIFZ_HOME_KEY));
const newId = () => `z${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * رئيسية قسم الحفظ: أذكاري ومسبحتي وآية التفسير. المنطق في utils/hifzHome؛ هنا التخزين.
 * تُزامَن مع الحساب (SYNCED_LOCAL_KEYS)، فتنزيل من السحابة يعيد القراءة.
 */
export default function useHifzHome() {
  const [home, setHome] = useState(load);

  useEffect(() => {
    const reload = () => setHome(load());
    window.addEventListener(LOCAL_SYNC_EVENT, reload);
    return () => window.removeEventListener(LOCAL_SYNC_EVENT, reload);
  }, []);

  const apply = useCallback((change) => {
    const current = load();
    const next = change(current, dayKey());
    if (next === current) return;
    saveStoredState(HIFZ_HOME_KEY, next);
    setHome(next);
  }, []);

  const actions = useMemo(() => ({
    tapZikr: (id) => apply((s, day) => tapZikr(s, day, id)),
    addZikr: (text, target) => apply((s) => addZikr(s, newId(), text, target)),
    removeZikr: (id) => apply((s) => removeZikr(s, id)),
    tapTasbeeh: () => apply((s, day) => tapTasbeeh(s, day)),
    zeroTasbeeh: () => apply(zeroTasbeeh),
    pickTasbeeh: (id) => apply((s) => pickTasbeeh(s, id)),
    addTasbeeh: (text, target) => apply((s) => addTasbeeh(s, newId(), text, target)),
    removeTasbeeh: (id) => apply((s) => removeTasbeeh(s, id)),
    setTafseerVerse: (ref) => apply((s) => setTafseerVerse(s, ref)),
  }), [apply]);

  return { home, day: dayKey(), actions };
}
