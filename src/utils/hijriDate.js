import { HIJRI_MOONS } from '../constants/hijriMonths';
import { dayKey, daysBetween, addDays } from './hifzSchedule';

// أطول شهر هجري: آخر شهر في الجدول لا يُعرف ختامه، فيُقبل منه ثلاثون يوماً فقط
const MAX_MONTH_DAYS = 30;
// قاعدة الفجر: هلال قبل DAWN_FROM يومُه هو الأوّل، ومن DAWN_TO فما بعد الغدُ هو الأوّل
const DAWN_FROM = '04:00';
const DAWN_TO = '05:00';

/**
 * اليوم الأوّل من الشهر من هلاله، بقاعدة الفجر.
 * @returns 'YYYY-MM-DD'، أو null إن وقع الهلال بين الرابعة والخامسة ولم يُكتب قرار (start)
 */
export function monthStart({ moon, start }) {
  if (start) return start;
  const [date, time] = moon.split(' ');
  if (time < DAWN_FROM) return date;
  if (time >= DAWN_TO) return addDays(date, 1);
  return null;
}

// الأشهر المعروفة بدايتها، بالترتيب، حتى أوّل هلال ينتظر قراراً (ما بعده لا يُبنى عليه)
const resolved = [];
for (const entry of HIJRI_MOONS) {
  const start = monthStart(entry);
  if (!start) break;
  resolved.push({ ...entry, start });
}
export const HIJRI_MONTH_STARTS = resolved;

// أوّل هلال بين الرابعة والخامسة ينتظر قرار صاحب البرنامج، أو null
export const PENDING_DAWN_MOON = HIJRI_MOONS.find((entry) => monthStart(entry) === null) ?? null;

/**
 * التاريخ الهجري من جدول الأهلّة المعتمد.
 * @param date Date
 * @returns { year, month (1..12), day } أو null إن لم يغطِّ الجدول هذا اليوم
 */
export function hijriFromTable(date) {
  const key = dayKey(date);
  for (let i = HIJRI_MONTH_STARTS.length - 1; i >= 0; i--) {
    const entry = HIJRI_MONTH_STARTS[i];
    if (entry.start > key) continue;
    const day = daysBetween(entry.start, key) + 1;
    const next = HIJRI_MONTH_STARTS[i + 1];
    if (next ? key >= next.start : day > MAX_MONTH_DAYS) return null;
    return { year: entry.year, month: entry.month, day };
  }
  return null;
}

// اليوم الميلادي لتاريخ هجري من الجدول، أو null إن لم يكن شهره فيه
export function hijriToDayKey(year, month, day) {
  const entry = HIJRI_MONTH_STARTS.find((m) => m.year === year && m.month === month);
  return entry ? addDays(entry.start, day - 1) : null;
}

// موضع الشهر الجاري في الجدول، أو -1 إن لم يغطِّ الجدول هذا اليوم
function tableIndexOf(date) {
  const h = hijriFromTable(date);
  return h ? HIJRI_MONTH_STARTS.findIndex((m) => m.year === h.year && m.month === h.month) : -1;
}

/**
 * ما يحتاجه تذكير المشرف: كم شهراً بعد الجاري في الجدول، وآخر شهر فيه.
 * @returns monthId مفتاح الشهر الجاري ('1448-5'، أو 'none-2027-4' خارج الجدول) — التذكير مرة كل شهر
 */
export function hijriTableCoverage(date) {
  const index = tableIndexOf(date);
  const last = HIJRI_MONTH_STARTS[HIJRI_MONTH_STARTS.length - 1];
  const current = index >= 0 ? HIJRI_MONTH_STARTS[index] : null;
  return {
    monthId: current ? `${current.year}-${current.month}` : `none-${date.getFullYear()}-${date.getMonth() + 1}`,
    ahead: index >= 0 ? HIJRI_MONTH_STARTS.length - 1 - index : 0,
    last,
  };
}
