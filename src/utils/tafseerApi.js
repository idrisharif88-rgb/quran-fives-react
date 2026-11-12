// ─── تفسير آية من الإنترنت (api.quran.com) ───
// المصحف والتطبيق كلّه بلا شبكة إلا التلاوة والمزامنة والنسخة؛ هذا استثناء رابع يطلبه المالك:
// صفحة «تفسير» في قسم الحفظ تجلب التفسير حين يفتحها المستخدم، ولا شيء يُجلب قبل ذلك.

const BASE = 'https://api.quran.com/api/v4/tafsirs';

// كتب التفسير العربية المتاحة، والأول هو الافتراضي (أقصرها وأيسرها)
export const TAFSEER_BOOKS = [
  { id: 16, name: 'الميسر' },
  { id: 91, name: 'السعدي' },
  { id: 14, name: 'ابن كثير' },
  { id: 15, name: 'الطبري' },
  { id: 90, name: 'القرطبي' },
  { id: 94, name: 'البغوي' },
  { id: 93, name: 'الوسيط' },
];
export const DEFAULT_TAFSEER_BOOK = TAFSEER_BOOKS[0].id;
export const isTafseerBook = (id) => TAFSEER_BOOKS.some((book) => book.id === id);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

// نصّ الخادم فيه وسوم (<p> و<br> و<span>): تُحوَّل الفقرات إلى أسطر والباقي يُسقط.
// الناتج نصّ خام يُعرض عقدةَ نصّ في React (لا innerHTML)، فلا يُنفَّذ منه شيء.
export function tafseerPlainText(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
      if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? match;
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isInteger(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    })
    .replace(/[ \t\u00a0]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * يجلب تفسير الآية من الكتاب. يرمي إن تعذّر الاتصال أو لم يوجد نصّ.
 * ما يجمعه الكتاب للآية مع جيرانها يعيده الخادم لها كما هو.
 * @returns {Promise<string>} النصّ بلا وسوم
 */
export async function fetchTafseer({ s, a }, bookId, signal) {
  const response = await fetch(`${BASE}/${bookId}/by_ayah/${s}:${a}`, { signal });
  if (!response.ok) throw new Error(`tafseer ${response.status}`);
  const text = tafseerPlainText((await response.json())?.tafsir?.text);
  if (!text) throw new Error('tafseer empty');
  return text;
}
