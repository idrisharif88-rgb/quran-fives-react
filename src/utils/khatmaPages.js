import { LAST_PAGE } from '../data/juzPages';

// ─── الصفحات المقروءة للختمة ───
// كل نقرة على دائرة العدّاد تُنهي صفحة: تُحفظ هنا مع وقتها، أيّاً كان العدّاد (القسم).
// تقدّم الختمة يعدّ ما نُقر بعد آخر ختمة مسجّلة، فلا يهمّ من أين بدأ كل قسم.
export const KHATMA_PAGES_KEY = 'quran-fives-khatma-pages-v1';

const isPage = (page) => Number.isInteger(page) && page >= 1 && page <= LAST_PAGE;

/** { [page]: ms } سليمة، تُسقط أيّ مدخل تالف */
export function normalizePages(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, at] of Object.entries(raw)) {
    const page = Number(key);
    if (isPage(page) && Number.isFinite(at)) out[page] = at;
  }
  return out;
}

export function markPage(pages, page, at) {
  if (!isPage(page)) return pages;
  return { ...pages, [page]: at };
}

export function unmarkPage(pages, page) {
  if (!(page in pages)) return pages;
  const next = { ...pages };
  delete next[page];
  return next;
}

/** الصفحات المقروءة بعد آخر ختمة (أو كلّها إن لم تُسجَّل ختمة) */
export function pagesReadSince(pages, since) {
  const read = new Set();
  for (const [page, at] of Object.entries(pages || {})) {
    if (!since || at > since) read.add(Number(page));
  }
  return read;
}

/** طابع آخر ختمة مسجّلة (ms)، أو null */
export function lastKhatmaTime(khatmas) {
  const times = (khatmas || []).map((k) => k.timestamp).filter(Number.isFinite);
  return times.length ? Math.max(...times) : null;
}

/**
 * هل تُتمّ هذه الصفحة الختمة؟ صحيح حين تكون آخر صفحة ناقصة من صفحات المصحف بعد آخر ختمة،
 * أيّاً كانت الصفحة التي بدأت منها الأقسام (400←604 ثم 1←399 تُتمّ عند 399).
 */
export function completesKhatma(pages, page, since) {
  if (!isPage(page)) return false;
  const read = pagesReadSince(pages, since);
  return !read.has(page) && read.size === LAST_PAGE - 1;
}
