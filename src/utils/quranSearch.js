import { QURAN_VERSES } from '../data/quranVerses.js';
import { SURAH_METADATA } from '../data/quranConstants.js';

// علامات التشكيل والمدّ والإطالة وعلامات الاتجاه — تُحذف كلّها قبل المقارنة
const TASHKEEL_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;
const DIRECTION_MARKS_RE = /[\u200E\u200F]/g;

/**
 * يوحّد النصّ العربي للمقارنة:
 *   - يحذف التشكيل (فتحة، ضمّة، كسرة، شدّة، سكون، تنوين…) والتطويل والمَدّات.
 *   - يوحّد الألفات (آ أ إ ٱ → ا) والياء المقصورة (ى → ي) والتاء المربوطة (ة → ه).
 *   - يزيل علامات الاتجاه والفراغات الزائدة.
 *
 * المستخدم يكتب عادةً بلا تشكيل وبألف بسيطة، والنصّ القرآني مشكّل،
 * فتتمّ المطابقة على الصيغتين الموحّدتين معاً.
 */
export function normalizeArabic(text) {
  return String(text ?? '')
    .replace(/\u0640/g, '')            // تطويل (ـ)
    .replace(TASHKEEL_RE, '')          // التشكيل والحركات
    .replace(DIRECTION_MARKS_RE, '')   // علامات الاتجاه
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // آ أ إ ٱ → ا
    .replace(/\u0649/g, '\u064A')      // ى → ي
    .replace(/\u0629/g, '\u0647')      // ة → ه
    .replace(/\s+/g, ' ')              // دمج الفراغات المتتالية
    .trim();
}

// ─── تمييز النصّ المطابق ─────────────────────────────────────────────────────
function isTashkeel(code) {
  return (code >= 0x0610 && code <= 0x061A)
    || (code >= 0x064B && code <= 0x065F)
    || code === 0x0670
    || (code >= 0x06D6 && code <= 0x06DC)
    || (code >= 0x06DF && code <= 0x06E8)
    || (code >= 0x06EA && code <= 0x06ED);
}

// يطبّق قواعد التوحيد نفسها على حرف واحد، ويعيد '' إن كان الحرف يُحذف
function normalizeChar(c) {
  const code = c.codePointAt(0);
  if (c === '\u0640') return '';                          // تطويل
  if (isTashkeel(code)) return '';                        // تشكيل
  if (c === '\u200E' || c === '\u200F') return '';        // علامات اتجاه
  if (c === '\u0622' || c === '\u0623' || c === '\u0625' || c === '\u0671') return '\u0627';
  if (c === '\u0649') return '\u064A';                    // ى → ي
  if (c === '\u0629') return '\u0647';                    // ة → ه
  return c;
}

// يبني نصّاً موحّداً مع خريطة (فهرس موحّد → فهرس أصلي) كي نعيد التمييز للنصّ المشكّل
function buildNormalizedWithMap(text) {
  const out = [];
  const map = [];
  let prevSpace = false;

  for (let i = 0; i < text.length; i++) {
    const nc = normalizeChar(text[i]);
    if (nc === '') continue;
    if (nc === ' ') {
      if (prevSpace) continue;
      prevSpace = true;
    } else {
      prevSpace = false;
    }
    out.push(nc);
    map.push(i);
  }

  return { normalized: out.join(''), map };
}

/**
 * يجد كلّ مواضع الكلمة/العبارة المبحوث عنها داخل نصّ الآية الأصلي (المشكّل)
 * ويعيد نطاقات [start, end) جاهزة للتمييز.
 */
export function findMatchRanges(text, query) {
  const nq = normalizeArabic(query);
  if (!nq || !text) return [];

  const { normalized, map } = buildNormalizedWithMap(text);
  const ranges = [];
  let from = 0;

  while (true) {
    const idx = normalized.indexOf(nq, from);
    if (idx === -1) break;
    const start = map[idx];
    let end = map[idx + nq.length - 1] + 1;
    // نمدّد النهاية لتشمل تشكيل الحرف الأخير (ضمّة، كسرة…) كي لا يطفو خارج التمييز
    while (end < text.length && normalizeChar(text[end]) === '') end++;
    ranges.push({ start, end });
    from = idx + 1;
  }

  return ranges;
}

// فهرس موحّد يُبنى مرّة واحدة ثمّ يُخزّن (6236 آية، فيبقى البحث سريعاً)
let cachedIndex = null;

export function buildSearchIndex() {
  if (cachedIndex) return cachedIndex;

  cachedIndex = QURAN_VERSES.map((verse) => ({
    s: verse.s,
    a: verse.a,
    t: verse.t,
    surahName: SURAH_METADATA[verse.s - 1]?.name || '',
    normalized: normalizeArabic(verse.t),
  }));

  return cachedIndex;
}

/**
 * بحث نصّي بسيط عن كلمة أو جزء من آية.
 *
 * @param {string} query   النصّ الذي يكتبه المستخدم
 * @param {{ limit?: number }} [options]  حدّ أقصى اختياري لعدد النتائج (بدون حدّ افتراضياً)
 * @returns {{ s: number, a: number, t: string, surahName: string }[]}
 */
export function searchQuran(query, { limit = Infinity } = {}) {
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery) return [];

  const index = buildSearchIndex();
  const results = [];

  for (const verse of index) {
    if (verse.normalized.includes(normalizedQuery)) {
      results.push({ s: verse.s, a: verse.a, t: verse.t, surahName: verse.surahName });
      if (results.length >= limit) break;
    }
  }

  return results;
}
