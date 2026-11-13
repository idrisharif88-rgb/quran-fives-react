// عمليات البحث السابقة في المكتبة — على هذا الجهاز، وتُمسح عند تسجيل الخروج (deviceData.js)
export const LIBRARY_RECENT_KEY = 'quran-fives-library-recent-v1';
const MAX = 6;

export function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(LIBRARY_RECENT_KEY));
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

// الأحدث أولاً، بلا تكرار
export function rememberSearch(q) {
  const text = q.trim();
  if (!text) return readRecent();
  const next = [text, ...readRecent().filter((s) => s !== text)].slice(0, MAX);
  try { localStorage.setItem(LIBRARY_RECENT_KEY, JSON.stringify(next)); } catch { /* التخزين غير متاح */ }
  return next;
}
