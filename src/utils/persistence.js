export const APP_STORAGE_KEY = 'quran-fives-app-state-v1';
export const KHMASIYAT_QUIZ_STORAGE_KEY = 'quran-fives-khmasiyat-quiz-v1';
export const RANDOM_AYAH_QUIZ_STORAGE_KEY = 'quran-fives-random-ayah-quiz-v1';
export const SURAH_COUNT_QUIZ_STORAGE_KEY = 'quran-fives-surah-count-quiz-v1';
export const PAGE_STARTS_QUIZ_STORAGE_KEY = 'quran-fives-page-starts-quiz-v1';
export const SURAH_NAMES_QUIZ_STORAGE_KEY = 'quran_fives_surah_names_quiz_state';
export const PLAYBACK_RATE_STORAGE_KEY = 'quran-fives-playback-rate-v1';
export const VERSE_STYLE_STORAGE_KEY = 'quran-fives-verse-style-v1';

// ما يُحفظ خارج حالة التطبيق ويُزامَن معها (localStores في لقطة المزامنة): تقدّم الاختبارات
// الخمسة وسرعة تشغيل التسجيلات ودفتر التحديثات. حفظ أيّ منها يُطلق LOCAL_SYNC_EVENT فيُرفع.
export const SYNCED_LOCAL_KEYS = [
  KHMASIYAT_QUIZ_STORAGE_KEY,
  RANDOM_AYAH_QUIZ_STORAGE_KEY,
  SURAH_COUNT_QUIZ_STORAGE_KEY,
  PAGE_STARTS_QUIZ_STORAGE_KEY,
  SURAH_NAMES_QUIZ_STORAGE_KEY,
  PLAYBACK_RATE_STORAGE_KEY,
  VERSE_STYLE_STORAGE_KEY,   // بطاقة الآيات: نصّ أو مصحف مدني (useVerseStyle)
  'quran-fives-updates-notebook-v1',   // دفتر التحديثات للمالك (updatesNotebook.js)
];
export const LOCAL_SYNC_EVENT = 'quran-fives-local-sync';

export function loadStoredState(storageKey) {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) return null;
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

export function saveStoredState(storageKey, value) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Ignore storage failures so the app keeps working.
  }
  if (SYNCED_LOCAL_KEYS.includes(storageKey)) window.dispatchEvent(new Event(LOCAL_SYNC_EVENT));
}

export function removeStoredState(storageKey) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage failures so the app keeps working.
  }
}

// ما في هذا الجهاز من SYNCED_LOCAL_KEYS ← { key: value } للقطة المزامنة
export function readSyncedLocal() {
  const stores = {};
  SYNCED_LOCAL_KEYS.forEach((key) => {
    const value = loadStoredState(key);
    if (value != null) stores[key] = value;
  });
  return stores;
}

// تنزيل نسخة السحابة: يُعيد ما فيها من SYNCED_LOCAL_KEYS إلى مواضعه (ما لا تحمله يبقى)
export function restoreSyncedLocal(stores) {
  if (!stores || typeof stores !== 'object') return;
  SYNCED_LOCAL_KEYS.forEach((key) => {
    if (stores[key] != null) {
      try { window.localStorage.setItem(key, JSON.stringify(stores[key])); } catch { /* تجاهل */ }
    }
  });
}
