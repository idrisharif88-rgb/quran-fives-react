import { useCallback, useEffect, useRef, useState } from 'react';
import { readRemoteBackup } from '../utils/googleBackup';
import { summarizeBackup } from '../utils/backupSummary';
import { linkedEmail } from '../utils/googleDrive';

async function read(interactive) {
  try {
    const remote = await readRemoteBackup({ interactive });
    return remote.backup
      ? { status: 'ready', summary: summarizeBackup(remote.backup), savedAt: remote.savedAt }
      : { status: remote.status };
  } catch (error) {
    return { status: 'error', error };
  }
}

/**
 * ما في نسخة درايف عند فتح القسم، بلا نافذة جوجل.
 * status: idle | loading | locked (يلزم تأكيد جوجل) | none (لا نسخة) | ready | error
 */
export default function useBackupSummary(email) {
  const [state, setState] = useState({ email: null, status: 'idle' });
  const requestRef = useRef(0);

  const load = useCallback(async ({ interactive = false } = {}) => {
    const id = ++requestRef.current;
    setState({ email, status: 'loading' });
    const next = await read(interactive);
    if (id === requestRef.current) setState({ email, ...next });
    return next;
  }, [email]);

  // ما حُفظ الآن هو ما في درايف: لا حاجة إلى قراءته من جديد
  const showSaved = useCallback((backup) => {
    requestRef.current++;
    setState({ email: linkedEmail(), status: 'ready', summary: summarizeBackup(backup), savedAt: backup.savedAt });
  }, []);

  useEffect(() => {
    if (!email) return undefined;
    const id = ++requestRef.current;
    read(false).then((next) => {
      if (id === requestRef.current) setState({ email, ...next });
    });
    return () => { requestRef.current = id + 1; };
  }, [email]);

  // ربط حساب جديد: لا يُعرض ملخّص الحساب السابق قبل وصول الجديد
  const current = !email ? { status: 'idle' } : state.email === email ? state : { status: 'loading' };
  return { ...current, load, showSaved };
}
