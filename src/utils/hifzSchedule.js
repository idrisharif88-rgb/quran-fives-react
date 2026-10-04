import { SURAH_METADATA } from '../data/quranConstants';

// ─── برنامج الحفظ: الجدول ───
// منطق صرف بلا واجهة ولا تخزين.
//
// القواعد كلها في كائن واحد يُخزَّن مع البرنامج (state.rules)، وكل دالة تأخذه معاملاً.
// هكذا تُضاف لاحقاً شاشة إعدادات تغيّر رقماً أو ترتيب الخطوات دون مساس بالمنطق.
// القيم الافتراضية قواعد صاحب البرنامج — لا تُغيَّر اجتهاداً.
export const DEFAULT_RULES = {
  versesPerDay: 1,       // الآيات الجديدة في اليوم (ورد اليوم) — يختاره المستخدم عند البدء
  listenTarget: 3,       // سماع المقرئ قبل الحفظ
  repeatTarget: 40,      // تكرار الآية الجديدة
  fiveTimes: 5,          // قراءة آية الأمس غيباً (للعرض)
  dailyOnceDays: 25,     // أيام القراءة مرة واحدة يومياً
  reviewCycleDays: 6,    // صندوق المراجعة الدائم: كل آية مرة كل ستة أيام
  reviewRun: 5,          // آيات متتالية تُسنَد لمجموعة مراجعة واحدة
  // خطوات الآية الجديدة بترتيبها الملزم — معرّفاتها في hifzSteps.js
  steps: ['listen', 'hafiz', 'memorize', 'record', 'repeat'],
};

// خيارات ورد اليوم المعروضة عند بدء البرنامج
export const VERSES_PER_DAY_CHOICES = [1, 3, 5, 7];

// قواعد مخزّنة ← قواعد كاملة: ما نقص يُؤخذ من الافتراضي (ترقية البيانات القديمة).
// برنامج بدأ قبل إضافة ورد اليوم يبقى آية واحدة في اليوم.
export const withDefaultRules = (rules) => {
  const merged = { ...DEFAULT_RULES, ...(rules || {}) };
  const perDay = Number(merged.versesPerDay);
  return { ...merged, versesPerDay: Number.isInteger(perDay) && perDay >= 1 ? perDay : DEFAULT_RULES.versesPerDay };
};

export const TOTAL_VERSES = SURAH_METADATA.reduce((sum, s) => sum + s.verseCount, 0);

// ─── اليوم ───
// اليوم ينقلب عند منتصف الليل بتوقيت الجهاز. مفتاح اليوم 'YYYY-MM-DD'.
export function dayKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// رقم اليوم (عدد صحيح) للفرق بين يومين — بلا تأثّر بالتوقيت الصيفي
export function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export const daysBetween = (fromKey, toKey) => dayNumber(toKey) - dayNumber(fromKey);

// ─── ترتيب الحفظ ───
// forward: من الفاتحة إلى الناس. backward: السور من الناس إلى الفاتحة، وآيات كل سورة بترتيبها.
export const DIRECTIONS = { FORWARD: 'forward', BACKWARD: 'backward' };

const surahOrder = (direction) => (
  direction === DIRECTIONS.BACKWARD ? [...SURAH_METADATA].reverse() : SURAH_METADATA
);

// الآية رقم index (من صفر) في ترتيب الحفظ ← { s, a }، أو null بعد ختم المصحف
export function verseAt(direction, index) {
  if (!Number.isInteger(index) || index < 0) return null;
  let remaining = index;
  for (const surah of surahOrder(direction)) {
    if (remaining < surah.verseCount) return { s: surah.id, a: remaining + 1 };
    remaining -= surah.verseCount;
  }
  return null;
}

// ─── دورة حياة الآية ───
// لكل آية ساعتها الخاصة: عمرها = عدد الأيام منذ يوم حفظها.
//   0        حُفظت اليوم (الخطوات الخمس)
//   1        صندوق الخمس: تُقرأ خمس مرات
//   2..26    صندوق الـ25: مرة واحدة يومياً
//   27+      صندوق المراجعة الدائم: مرة كل ستة أيام
export const STAGES = { TODAY: 'today', FIVE: 'five', DAILY: 'daily', REVIEW: 'review' };

export function stageOfAge(age, rules = DEFAULT_RULES) {
  if (age <= 0) return STAGES.TODAY;
  if (age === 1) return STAGES.FIVE;
  if (age <= 1 + rules.dailyOnceDays) return STAGES.DAILY;
  return STAGES.REVIEW;
}

// مجموعة المراجعة (0..5) للآية حسب ترتيب حفظها: كل reviewRun آيات متتالية في مجموعة،
// فتُقرأ الآيات المتجاورة في اليوم نفسه وتتوازن أحمال الأيام الستة.
export const reviewGroupOf = (index, rules = DEFAULT_RULES) => (
  Math.floor(index / rules.reviewRun) % rules.reviewCycleDays
);

// مجموعة اليوم: تدور كل ستة أيام ابتداءً من أول يوم في البرنامج
export function reviewGroupOfDay(startedOn, today, rules = DEFAULT_RULES) {
  const days = daysBetween(startedOn, today);
  return ((days % rules.reviewCycleDays) + rules.reviewCycleDays) % rules.reviewCycleDays;
}

/**
 * صناديق اليوم.
 * @param memorizedOn مفتاح يوم حفظ كل آية، بترتيب الحفظ (الفهرس = رقم الآية في الترتيب)
 * @returns فهارس الآيات في كل صندوق: { today, five, daily, review }
 */
export function boxesFor(memorizedOn, startedOn, today, rules = DEFAULT_RULES) {
  const boxes = { today: [], five: [], daily: [], review: [] };
  const todayGroup = reviewGroupOfDay(startedOn, today, rules);
  memorizedOn.forEach((key, index) => {
    const stage = stageOfAge(daysBetween(key, today), rules);
    if (stage !== STAGES.REVIEW) boxes[stage].push(index);
    else if (reviewGroupOf(index, rules) === todayGroup) boxes.review.push(index);
  });
  return boxes;
}

// عدد الآيات التي تخرّجت إلى صندوق المراجعة الدائم (كل مجموعاته)
export function reviewTotal(memorizedOn, today, rules = DEFAULT_RULES) {
  return memorizedOn.filter((key) => stageOfAge(daysBetween(key, today), rules) === STAGES.REVIEW).length;
}

// فهارس ← مقاطع متصلة داخل السورة الواحدة: [{ s, from, to }] للعرض «البقرة 74–98»
export function verseRanges(direction, indices) {
  const ranges = [];
  for (const index of indices) {
    const verse = verseAt(direction, index);
    if (!verse) continue;
    const last = ranges[ranges.length - 1];
    if (last && last.s === verse.s && verse.a === last.to + 1) last.to = verse.a;
    else ranges.push({ s: verse.s, from: verse.a, to: verse.a });
  }
  return ranges;
}
