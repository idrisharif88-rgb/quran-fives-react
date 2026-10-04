import { SURAH_METADATA } from '../../data/quranConstants';

// نصوص برنامج الحفظ في مكان واحد — إضافة خطوة جديدة تحتاج عنواناً هنا
export const STEP_TEXT = {
  listen: { title: 'سماع المقرئ', hint: (rules) => `استمع للآية ${rules.listenTarget} مرات قبل الحفظ` },
  hafiz: { title: 'تأكيد الحافظ', hint: () => 'تواصل مع شيخك واقرأ عليه الآية، ثم انتظر تأكيده لصحة قراءتك' },
  memorize: { title: 'الحفظ', hint: () => 'احفظ الآية غيباً' },
  record: { title: 'التسجيل', hint: () => 'سجّل الآية ثلاث مرات متتالية بلا خطأ، ثم اسمعها وعينك على المصحف' },
  repeat: { title: 'التكرار', hint: (rules) => `كرّر الآية ${rules.repeatTarget} مرة` },
};

export const BOX_TEXT = {
  five: { title: 'آية الأمس', hint: (rules) => `تُقرأ غيباً ${rules.fiveTimes} مرات` },
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
