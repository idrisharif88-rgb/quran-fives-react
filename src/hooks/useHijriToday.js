import { useEffect, useMemo, useState } from 'react';
import { dayKey } from '../utils/hifzSchedule';

/**
 * التاريخ الهجري لليوم الجاري، يتجدّد وحده: عند منتصف الليل، وعند عودة التطبيق من الخلفية
 * (يبقى حيّاً فيها أياماً على أندرويد)، وبفحص كل دقيقة احتياطاً إن جُمّدت المؤقّتات.
 * كان يُحسب مرة عند فتح التطبيق، فيبقى تاريخ الأمس على الشاشة.
 * @param format (Date) => أجزاء التاريخ المعروضة — محلياً بلا شبكة
 */
export default function useHijriToday(format) {
  const [day, setDay] = useState(() => dayKey());

  useEffect(() => {
    const refresh = () => setDay(dayKey());
    let midnight;
    const armMidnight = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      midnight = setTimeout(() => { refresh(); armMidnight(); }, next - now);
    };
    armMidnight();
    const minute = setInterval(refresh, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(midnight);
      clearInterval(minute);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => format(new Date()), [day, format]);
}
