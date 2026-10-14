import { JUZ_START_PAGES, juzPageRange } from '../data/juzPages';
import { dayKey, daysBetween } from './hifzSchedule';
import { hijriToDayKey } from './hijriDate';

// ─── تقدّم الختمة ومعدّل الختمات ─── منطق صرف بلا واجهة.

// الختمة في عشرة أيام على الأكثر — حدّ صاحب البرنامج، لا يُغيَّر اجتهاداً
export const KHATMA_TARGET_DAYS = 10;
// بداية حساب معدّل الختمات: 13 ذو الحجة 1447هـ، من جدول الأهلّة المعتمد
export const KHATMA_EPOCH = hijriToDayKey(1447, 12, 13);
// فوق المعدّل الأساسي بهذه النسبة يصير اللحاق في خطر
const AT_RISK_RATIO = 1.5;

const TOTAL_PARTS = JUZ_START_PAGES.length;
const BASE_RATE = TOTAL_PARTS / KHATMA_TARGET_DAYS;   // 3 أجزاء في اليوم

// الأجزاء المقروءة بكسورها من عدد الصفحات المنجزة (الأجزاء ليست متساوية الصفحات)
export function partsRead(pagesDone) {
  let parts = 0;
  for (let juz = 1; juz <= TOTAL_PARTS; juz++) {
    const { start, end } = juzPageRange(juz);
    const count = end - start + 1;
    parts += Math.min(count, Math.max(0, pagesDone - start + 1)) / count;
  }
  return parts;
}

/**
 * أين وصلت الختمة الجارية قياساً إلى حدّ الأيام العشرة.
 * @param lastKhatmaAt طابع آخر ختمة مسجّلة (ms)، أو null فتُحسب من KHATMA_EPOCH
 * @param page         قيمة العدّاد: الصفحة التي يُقرأ فيها الآن (ما قبلها منجز)
 * @param today        مفتاح اليوم 'YYYY-MM-DD'
 * @returns dayNumber  رقم اليوم في الختمة: يوم الختم لا يُعدّ، واليوم الأوّل غده (ختم قبل 3 أيام ← اليوم
 *                     الثالث). صفر في يوم الختم نفسه.
 *          read, left أجزاء — daysLeft أيام باقية واليوم منها — rate المطلوب يومياً (null إن فات الموعد)
 *          status     'done' | 'onTrack' | 'speedUp' | 'atRisk' | 'late'
 */
export function khatmaProgress({ lastKhatmaAt, page, today }) {
  const startKey = lastKhatmaAt ? dayKey(new Date(lastKhatmaAt)) : KHATMA_EPOCH;
  const dayNumber = Math.max(0, daysBetween(startKey, today));
  const read = partsRead(Math.max(0, (Number(page) || 0) - 1));
  const left = Math.max(0, TOTAL_PARTS - read);
  // يوم الختم نفسه: الأيام العشرة كلّها أمامه
  const daysLeft = dayNumber === 0 ? KHATMA_TARGET_DAYS : KHATMA_TARGET_DAYS - dayNumber + 1;
  const rate = daysLeft > 0 ? left / daysLeft : null;

  let status = 'atRisk';
  if (left <= 0) status = 'done';
  else if (rate === null) status = 'late';
  else if (rate <= BASE_RATE) status = 'onTrack';
  else if (rate <= BASE_RATE * AT_RISK_RATIO) status = 'speedUp';

  return { dayNumber, read, left, daysLeft, rate, status };
}

/**
 * معدّل الختمات منذ KHATMA_EPOCH: الأيام المنقضية ÷ الختمات المسجّلة فيها.
 * @param timestamps طوابع الختمات المسجّلة (ms)
 * @returns days, count, average (أيام لكل ختمة) أو null بلا ختمات
 */
export function khatmaAverage({ timestamps, today }) {
  const days = Math.max(1, daysBetween(KHATMA_EPOCH, today));
  const count = timestamps.filter((t) => dayKey(new Date(t)) >= KHATMA_EPOCH && dayKey(new Date(t)) <= today).length;
  return { days, count, average: count > 0 ? days / count : null };
}
