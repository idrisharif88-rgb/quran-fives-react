import { LOCAL_SYNC_EVENT } from './persistence';

// عمليات البحث السابقة في المكتبة — كلّها تُحفظ (طلب المالك)، وتُزامَن مع الحساب (SYNCED_LOCAL_KEYS)،
// وتُمسح عند تسجيل الخروج (deviceData.js). سقف كبير يحمي التخزين وحده، لا يُرى في الاستعمال.
export const LIBRARY_RECENT_KEY = 'quran-fives-library-recent-v1';
const MAX = 500;

export function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(LIBRARY_RECENT_KEY));
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function save(next) {
  try { localStorage.setItem(LIBRARY_RECENT_KEY, JSON.stringify(next)); } catch { /* التخزين غير متاح */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(LOCAL_SYNC_EVENT));   // تُرفع مع المزامنة
  return next;
}

// الأحدث أولاً، بلا تكرار
export function rememberSearch(q) {
  const text = q.trim();
  if (!text) return readRecent();
  return save([text, ...readRecent().filter((s) => s !== text)].slice(0, MAX));
}

/** يحذف بحثاً واحداً أو عدّة */
export function forgetSearches(items) {
  const drop = new Set(items);
  return save(readRecent().filter((s) => !drop.has(s)));
}

export const clearSearches = () => save([]);
