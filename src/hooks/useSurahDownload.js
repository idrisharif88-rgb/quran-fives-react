import { useState, useCallback } from 'react';
import { downloadSurah } from '../utils/audioDownloader';

/**
 * تحميل تلاوة سورة كاملة بصوت مقرئ إلى الجهاز (مساحة التطبيق الخاصة، بلا اختيار مجلّد)
 * لتُسمع بلا إنترنت. ما حُمّل من قبل لا يُعاد تحميله.
 * @returns busy, progress { downloaded, total } | null, message, download(surah, reciter)
 */
export default function useSurahDownload() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [message, setMessage] = useState('');

  const download = useCallback(async (surah, reciter) => {
    setBusy(true);
    setMessage('');
    setProgress({ downloaded: 0, total: 0 });
    try {
      await downloadSurah(surah, reciter, setProgress);
      setMessage('تم التحميل — تُسمع الآن بلا إنترنت.');
    } catch {
      setMessage('لم يكتمل التحميل. تأكّد من الإنترنت وأعد المحاولة؛ ما حُمّل محفوظ.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, []);

  return { busy, progress, message, download };
}
