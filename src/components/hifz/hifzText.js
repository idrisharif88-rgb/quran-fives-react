import { SURAH_METADATA } from '../../data/quranConstants';
import { recordingRefs } from '../../utils/hifzRecordingRefs';

// ورد اليوم آية أو آيات (rules.versesPerDay): النصوص تتبع العدد
export const isMulti = (rules) => rules.versesPerDay > 1;
const unit = (rules) => (isMulti(rules) ? 'الآيات' : 'الآية');

// نصوص برنامج الحفظ في مكان واحد — إضافة خطوة جديدة تحتاج عنواناً هنا
export const STEP_TEXT = {
  listen: { title: 'سماع المقرئ', hint: (rules) => `استمع إلى ${unit(rules)} ${rules.listenTarget} مرات قبل الحفظ` },
  hafiz: { title: 'تأكيد الحافظ', hint: (rules) => `تواصل مع شيخك واقرأ عليه ${unit(rules)}، ثم انتظر تأكيده لصحة قراءتك` },
  memorize: { title: 'الحفظ', hint: (rules) => `احفظ ${unit(rules)} غيباً` },
  record: { title: 'التسجيل', hint: (rules) => `سجّل ${unit(rules)} ثلاث مرات متتالية بلا خطأ، ثم اسمعها وعينك على المصحف` },
  repeat: { title: 'التكرار', hint: (rules) => `كرّر ${unit(rules)} ${rules.repeatTarget} مرة` },
};

export const BOX_TEXT = {
  five: { title: (rules) => (isMulti(rules) ? 'آيات الأمس' : 'آية الأمس'), hint: (rules) => `تُقرأ غيباً ${rules.fiveTimes} مرات` },
  daily: { title: (rules) => `صندوق الـ${rules.dailyOnceDays}`, hint: () => 'كل آية مرة واحدة' },
  review: { title: 'المراجعة الدائمة', hint: (rules) => `مجموعة اليوم — كل آية مرة كل ${rules.reviewCycleDays} أيام` },
};

export const boxTitle = (box, rules) => {
  const title = BOX_TEXT[box].title;
  return typeof title === 'function' ? title(rules) : title;
};

export const surahName = (s) => SURAH_METADATA[s - 1]?.name ?? '';

// عزل اتجاه الأرقام (LRI…PDI): داخل نصّ عربي ينقلب «67–91» إلى «91–67»
const ltr = (text) => `\u2066${text}\u2069`;

// [{ s, from, to }] ← «البقرة 74–98 · آل عمران 1»
export const rangesText = (ranges) => ranges
  .map((r) => `${surahName(r.s)} ${ltr(r.from === r.to ? r.from : `${r.from}–${r.to}`)}`)
  .join(' · ');

// [{ s, a }] متتالية ← مقاطع داخل السورة الواحدة [{ s, from, to }]
export function rangesOfRefs(refs) {
  const ranges = [];
  for (const ref of refs) {
    const last = ranges[ranges.length - 1];
    if (last && last.s === ref.s && ref.a === last.to + 1) last.to = ref.a;
    else ranges.push({ s: ref.s, from: ref.a, to: ref.a });
  }
  return ranges;
}

// «الفاتحة 7 · البقرة 1–2» لآيات ورد اليوم
export const refsText = (refs) => rangesText(rangesOfRefs(refs));

// تسجيل ← وصف آياته. refs تُحفظ مع تسجيل الورد المتعدّد؛ التسجيلات الأقدم آية واحدة.
export const recordingText = (recording) => refsText(recordingRefs(recording));
