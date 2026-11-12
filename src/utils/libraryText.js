// توحيد البحث كما على السيرفر (server/library/normalize.js) — نسخة مطابقة لتلوين الكلمات المطابقة.
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

export const normalizeArabic = (s) => String(s ?? '')
  .replace(MARKS, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه');

const bare = (w) => normalizeArabic(w).replace(/[^\p{L}\p{N}]/gu, '');

// الكلمة تطابق إن ساوت كلمة البحث أو سبقتها سابقة (و، ب، فـ، لـ، ال، وبال…): «بالصلاة» لـ«الصلاة».
// مطابق لتوسعة السيرفر (variantsOf في server/library/normalize.js).
// آخر كلمة تطابق بدايتها أيضاً، كما يبحث السيرفر بالبادئة.
const PREFIX = 4;
const matches = (word, term, isLast) => {
  const stem = term.startsWith('ال') && term.length > 3 ? term.slice(2) : term;
  if (stem !== term && word.endsWith(stem) && word.length - stem.length <= PREFIX && /ل/.test(word.slice(0, -stem.length))) return true;
  const at = word.indexOf(term);
  if (at < 0 || at > PREFIX) return false;
  return at + term.length === word.length || (isLast && at === 0);
};

// النص → [{ text, hit }]
export function highlightParts(text, query) {
  const terms = normalizeArabic(query).split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1);
  if (!terms.length) return [{ text, hit: false }];
  const last = terms.length - 1;
  return text.split(/(\s+)/).map((w) => {
    const b = bare(w);
    return { text: w, hit: Boolean(b) && terms.some((t, i) => matches(b, t, i === last)) };
  });
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const arabicNumber = (n) => String(n).replace(/\d/g, (d) => AR_DIGITS[d]);

// «ج ٢، ص ٤٩٣» (لا «·»: تشبه الصفر العربي) — كتاب بمجلد واحد (المجلد 0 في OpenITI) يُكتفى بصفحته
export function placeLabel({ vol, page }, long = false) {
  if (page == null) return '';
  const p = `${long ? 'الصفحة' : 'ص'} ${arabicNumber(page)}`;
  return vol ? `${long ? 'الجزء' : 'ج'} ${arabicNumber(vol)}، ${p}` : p;
}
