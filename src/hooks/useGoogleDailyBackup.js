import { useEffect } from 'react';
import { GOOGLE_ENABLED } from '../utils/googleDrive';
import { dailyBackupIfDue } from '../utils/googleBackup';

// النسخ اليومي إلى جوجل درايف عند فتح التطبيق وعند الرجوع إليه — لمن يملك الصلاحية فقط.
// لا يفتح نافذة جوجل أبداً: المفتاح المنتهي يُجدَّد بصمت، فإن تعذّر ينتظر «احفظ الآن» في لوحة المزامنة.
export default function useGoogleDailyBackup(allowed) {
  useEffect(() => {
    if (!allowed || !GOOGLE_ENABLED) return undefined;
    const run = () => { dailyBackupIfDue().catch(() => {}); };
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    run();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [allowed]);
}
