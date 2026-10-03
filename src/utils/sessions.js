import { timeBucket, BUCKETS, getCity } from './prayerTimes';
import { juzOfPage } from '../data/juzPages';

// نموذج الجلسة: append-only — لا يُكتب فوق أي جلسة سابقة أبداً.
// تُخزَّن محلياً (مصدر الحقيقة) وتُضمَّن في حمولة المزامنة إلى الخادم.

export const DUA_PRESETS = [
  'اللهم اجعل القرآن ربيع قلبي ونور صدري وجلاء همّي',
  'ربِّ زدني علماً',
  'اللهم ارزقني حفظ كتابك والعمل به',
  'اللهم أعنّي على تلاوته آناء الليل وأطراف النهار',
];

// تنسيق زمن بصيغة م:ث (مثال 1:23)
export function formatSeconds(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

// بناء جلسة من قائمة الجولات (الصفحات). laps = [{page, ms}]
export function buildSessionFromLaps(laps, startedAt, finishedAt) {
  if (!Array.isArray(laps) || laps.length === 0) return null;
  const sorted = [...laps].sort((a, b) => a.page - b.page);
  const startPage = sorted[0].page;
  const endPage = sorted[sorted.length - 1].page;
  const totalSeconds = sorted.reduce((s, l) => s + l.ms, 0) / 1000;
  const avgSeconds = totalSeconds / sorted.length;
  const fastest = sorted.reduce((a, b) => (b.ms < a.ms ? b : a));
  const slowest = sorted.reduce((a, b) => (b.ms > a.ms ? b : a));
  const juzNumber = juzOfPage(startPage);
  return {
    juzNumber,
    startPage,
    endPage,
    totalSeconds,
    avgSeconds,
    fastestPage: { page: fastest.page, seconds: fastest.ms / 1000 },
    slowestPage: { page: slowest.page, seconds: slowest.ms / 1000 },
    pageTimes: sorted.map((l) => ({ page: l.page, seconds: l.ms / 1000 })),
    startedAt: startedAt ? new Date(startedAt).toISOString() : null,
    finishedAt: finishedAt ? new Date(finishedAt).toISOString() : new Date().toISOString(),
    dua: '',
    bookmarked: true,
  };
}

// متوسط كل الأجزاء المحفوظة (للثواني)
export function allTimeAverage(sessions) {
  if (!sessions.length) return null;
  const total = sessions.reduce((s, x) => s + x.avgSeconds, 0);
  return total / sessions.length;
}

// متوسط الجزء السابق (قبل رقم الجزء الحالي)
export function previousJuzAverage(sessions, juzNumber) {
  const prev = sessions
    .filter((s) => s.juzNumber < juzNumber)
    .sort((a, b) => b.juzNumber - a.juzNumber)[0];
  return prev ? prev.avgSeconds : null;
}

// أفضل فترة زمنية للقراءة (الأسرع في المتوسط) من الجلسات المحفوظة
export function bestTimeBucket(sessions, city) {
  const stats = {};
  sessions.forEach((s) => {
    if (!s.startedAt) return;
    const bucket = timeBucket(new Date(s.startedAt), getCity(city));
    if (!stats[bucket]) stats[bucket] = { sum: 0, count: 0 };
    stats[bucket].sum += s.avgSeconds;
    stats[bucket].count += 1;
  });
  let best = null;
  Object.keys(stats).forEach((b) => {
    const avg = stats[b].sum / stats[b].count;
    if (!best || avg < best.avg) best = { bucket: b, avg };
  });
  if (!best) return null;
  const label = BUCKETS.find((b) => b.id === best.bucket)?.label || best.bucket;
  return { id: best.bucket, label, avg };
}
