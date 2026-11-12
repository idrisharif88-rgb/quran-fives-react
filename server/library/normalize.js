// توحيد النص العربي للبحث — يُستعمل عند البناء وعند الاستعلام فيتطابقان دائماً.
// يحذف التشكيل والتطويل، ويوحّد الألف (أإآٱ→ا) والياء (ى→ي) والتاء المربوطة (ة→ه).
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

export function normalizeArabic(s) {
  return String(s ?? '')
    .replace(MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

// نص الفهرسة: بعد التوحيد يُحذف رقم الحاشية «(6)» ومعلم الصفحة «ms0001»
export function indexText(s) {
  return normalizeArabic(s)
    .replace(/\bms\d+\b/g, ' ')
    .replace(/\(\d+\)/g, ' ');
}

// كلمة البحث → استعلام FTS5 آمن: كل كلمة بين علامتي تنصيص، و AND بينها،
// وآخر كلمة بحرف البادئة (*) ليعمل البحث أثناء الكتابة.
export function toFtsQuery(q) {
  const words = indexText(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!words.length) return '';
  return words.map((w, i) => `"${w}"${i === words.length - 1 ? '*' : ''}`).join(' AND ');
}
