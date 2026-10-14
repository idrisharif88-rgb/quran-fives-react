import { useState, useCallback, useEffect } from 'react';
import { dayKey } from '../utils/hifzSchedule';

// عدد الآيات التي يُطلب تفسيرها كل يوم
export const TAFSIR_DAILY_GOAL = 5;
// { day, keys, postponedDay, shownDay } على هذا الجهاز: الآيات التي كُتب تفسيرها اليوم، واليوم الذي أُجّل فيه
// التذكير، وآخر يوم ظهر فيه
const KEY = 'quran-fives-tafsir-reminder-v1';

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch { return {}; }
};
const write = (value) => { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* تجاهل */ } };

/**
 * تذكير يومي بكتابة تفسير خمس آيات على ظهر بطاقاتها. يظهر عند أوّل فتح للتطبيق في اليوم وحده، ويختفي
 * لليوم حين تُفسَّر خمس آيات مختلفة، أو حين يؤجَّل، أو بعد الانتقال إلى الخماسيات حتى الفتح التالي.
 */
export default function useTafsirReminder() {
  const [saved, setSaved] = useState(read);
  const [dismissed, setDismissed] = useState(false);
  // ظهر اليوم من قبل (فتح سابق أو تحديث للصفحة): لا يعود حتى الغد
  const [shownBefore] = useState(() => saved.shownDay === dayKey());
  const today = dayKey();
  const count = saved.day === today && Array.isArray(saved.keys) ? saved.keys.length : 0;

  const open = !dismissed && !shownBefore && saved.postponedDay !== today && count < TAFSIR_DAILY_GOAL;
  const message = `تفسير ${TAFSIR_DAILY_GOAL} آيات اليوم ${count}/${TAFSIR_DAILY_GOAL}`; // قصير: يتّسع مع الزرّين على الهاتف

  const remember = useCallback((update) => {
    setSaved((prev) => {
      const next = update(prev);
      if (next !== prev) write({ ...read(), ...next }); // يبقي shownDay المكتوب خارج الحالة
      return next;
    });
  }, []);

  // تُستدعى مع كل حفظ لتفسير آية؛ النص الفارغ (حذف) لا يُعدّ
  const recordSaved = useCallback((key, text) => {
    if (!text || !text.trim()) return;
    remember((prev) => {
      const day = dayKey();
      const keys = prev.day === day && Array.isArray(prev.keys) ? prev.keys : [];
      if (keys.includes(key)) return prev;
      return { ...prev, day, keys: [...keys, key] };
    });
  }, [remember]);

  // يُكتب على الجهاز فقط: هذا الفتح يبقيه ظاهراً، والفتح التالي في اليوم نفسه لا يعرضه
  useEffect(() => {
    if (open) write({ ...read(), shownDay: today });
  }, [open, today]);

  const postpone = useCallback(() => remember((prev) => ({ ...prev, postponedDay: dayKey() })), [remember]);
  const hide = useCallback(() => setDismissed(true), []);

  return { open, message, recordSaved, postpone, hide };
}
