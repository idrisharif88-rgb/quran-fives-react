import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadStoredState, saveStoredState, LOCAL_SYNC_EVENT } from '../utils/persistence';
import { NOTEBOOK_STORAGE_KEY, normalizeNotes, saveNote, toggleDone, removeNote } from '../utils/updatesNotebook';

const load = () => normalizeNotes(loadStoredState(NOTEBOOK_STORAGE_KEY));

// دفتر التحديثات: يُحفظ محلياً ويُزامَن مع الحساب ضمن localStores (SYNCED_LOCAL_KEYS)
export default function useUpdatesNotebook() {
  const [notes, setNotes] = useState(load);

  // تنزيل من السحابة على هذا الجهاز يُعيد القراءة
  useEffect(() => {
    const reload = () => setNotes(load());
    window.addEventListener(LOCAL_SYNC_EVENT, reload);
    return () => window.removeEventListener(LOCAL_SYNC_EVENT, reload);
  }, []);

  const apply = useCallback((change) => {
    const next = change(load());
    saveStoredState(NOTEBOOK_STORAGE_KEY, next);
    setNotes(next);
  }, []);

  return useMemo(() => ({
    notes,
    save: (note) => apply((list) => saveNote(list, note)),
    toggle: (id) => apply((list) => toggleDone(list, id)),
    remove: (id) => apply((list) => removeNote(list, id)),
  }), [notes, apply]);
}
