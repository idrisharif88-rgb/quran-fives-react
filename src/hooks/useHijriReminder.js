import { useState, useCallback } from 'react';
import { hijriTableCoverage, PENDING_DAWN_MOON } from '../utils/hijriDate';
import { dayKey, daysBetween } from '../utils/hifzSchedule';

// الأشهر التي يُطلب أن يسبق بها جدول بدايات الأشهر الشهرَ الجاري
export const MONTHS_AHEAD_WANTED = 12;
// هلال بين الرابعة والخامسة يُسأل عنه قبل موعده بهذه الأيام
const DAWN_ASK_DAYS = 3;
// { closedMonth, closedDawn, postponedDay } على هذا الجهاز: أُغلق في هذا الشهر الهجري، أو أُغلق
// السؤال عن هذا الهلال، أو أُجّل في هذا اليوم
const KEY = 'quran-fives-hijri-reminder-v1';

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch { return {}; }
};
const write = (value) => { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* تجاهل */ } };

/**
 * تذكير المشرف وحده: هلال قادم بين الرابعة والخامسة (قبله بثلاثة أيام) يُسأل عنه أوّلاً؛ وإلا مرة
 * في كل شهر هجري بإضافة بدايات الأشهر القادمة حين يقلّ ما في الجدول عن اثني عشر شهراً بعد الجاري. «إغلاق» يسكته حتى الشهر التالي، و«تأجيل» حتى الغد —
 * محفوظان على الجهاز، فإعادة تحميل الصفحة لا تعيده.
 * @param isOwner حساب المشرف
 */
export default function useHijriReminder(isOwner) {
  const [coverage] = useState(() => hijriTableCoverage(new Date()));
  const [saved, setSaved] = useState(read);
  const today = dayKey();

  const [moonDay, moonTime] = PENDING_DAWN_MOON ? PENDING_DAWN_MOON.moon.split(' ') : [];
  const daysToMoon = moonDay ? daysBetween(today, moonDay) : null;
  const askDawn = daysToMoon !== null && daysToMoon <= DAWN_ASK_DAYS && saved.closedDawn !== PENDING_DAWN_MOON.moon;
  const askMonths = coverage.ahead < MONTHS_AHEAD_WANTED && saved.closedMonth !== coverage.monthId;

  const open = Boolean(isOwner) && saved.postponedDay !== today && (askDawn || askMonths);
  const when = daysToMoon > 0 ? `بعد ${daysToMoon} أيام` : 'اليوم';
  const message = askDawn
    ? `هلال ${PENDING_DAWN_MOON.name} ${when} الساعة ${moonTime} — راجع وقت الفجر وأخبرني`
    : 'الرجاء إضافة بدايات أهلّة جديدة!';

  const remember = useCallback((change) => {
    setSaved((prev) => {
      const next = { ...prev, ...change };
      write(next);
      return next;
    });
  }, []);
  const close = useCallback(() => remember(askDawn ? { closedDawn: PENDING_DAWN_MOON.moon } : { closedMonth: coverage.monthId }), [remember, askDawn, coverage.monthId]);
  const postpone = useCallback(() => remember({ postponedDay: dayKey() }), [remember]);

  return { open, message, close, postpone };
}
