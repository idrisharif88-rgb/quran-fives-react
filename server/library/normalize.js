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

// سوابق تلتصق بالكلمة: «الصلاة» تجد «بالصلاة» و«والصلاة» و«للصلاة»، و«صلاة» تجد «الصلاة».
// التوسعة في الاستعلام وحده، فلا تتغيّر القاعدة ولا تُقصّ حروف أصلية (كتاب ≠ تاب).
const CLITICS = ['', 'و', 'ف', 'ب', 'ك', 'ل', 'وب', 'فب', 'ول', 'فل', 'وك'];

export function variantsOf(word) {
  const stem = word.startsWith('ال') && word.length > 3 ? word.slice(2) : word;
  const out = new Set(CLITICS.map((c) => c + word));
  if (stem !== word || word.length > 2) {
    for (const c of CLITICS) out.add(c + 'ال' + stem);   // والصلاه، بالصلاه…
    out.add('لل' + stem);                                   // للصلاه
    out.add('ولل' + stem);
    out.add('فلل' + stem);
  }
  return [...out];
}

// كلمة البحث → استعلام FTS5 آمن: كل كلمة وصيغها بين علامتي تنصيص يجمعها OR، و AND بين الكلمات،
// وآخر كلمة بحرف البادئة (*) ليعمل البحث أثناء الكتابة.
export const MIN_LETTERS = 2;

// exact: العبارة كما هي — الكلمات متتالية بلا سوابق ولا بادئة
export function toFtsQuery(q, { exact = false } = {}) {
  const words = indexText(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  // حرف واحد يطابق عشرات آلاف المقاطع ولا يفيد: البحث يبدأ من حرفين
  if (words.join('').length < MIN_LETTERS) return '';
  if (exact) return `"${words.join(' ')}"`;
  return words.map((w, i) => {
    const star = i === words.length - 1 ? '*' : '';
    const forms = variantsOf(w).map((v) => `"${v}"${star}`);
    return forms.length > 1 ? `(${forms.join(' OR ')})` : forms[0];
  }).join(' AND ');
}
