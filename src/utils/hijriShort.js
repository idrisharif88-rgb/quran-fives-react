// التاريخ الهجري المختصر في أسفل الشاشة الرئيسية: «جمعة 3 جمادى II 48».
// اختاره المالك (2026-11-13) بدل دائرة التقويم التي كانت تعرض كلمة كلّ ثانية ونصف.
// الشهران المكرّران يأخذان رقماً رومانياً (ordinal)، والسنة آخر رقمين.
const SHORT_MONTHS = {
  'ربيع الأول': ['ربيع', 'I'],
  'ربيع الثاني': ['ربيع', 'II'],
  'جمادى الأولى': ['جمادى', 'I'],
  'جمادى الثانية': ['جمادى', 'II'],
};

/**
 * @param parts [اليوم بلا «ال»، رقم اليوم، اسم الشهر، السنة] كما يعيدها calcHijriOffline
 * @returns {{ weekday, day, month, ordinal, year } | null} ordinal فارغ لغير الشهرين المكرّرين
 */
export function shortHijri(parts) {
  if (!Array.isArray(parts) || parts.length < 4) return null;
  const [weekday, day, monthName, year] = parts;
  const [month, ordinal = ''] = SHORT_MONTHS[monthName] || [monthName];
  return { weekday, day: String(day), month, ordinal, year: String(year).slice(-2) };
}
