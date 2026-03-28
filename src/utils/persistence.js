export const APP_STORAGE_KEY = 'quran-fives-app-state-v1';
export const KHMASIYAT_QUIZ_STORAGE_KEY = 'quran-fives-khmasiyat-quiz-v1';
export const RANDOM_AYAH_QUIZ_STORAGE_KEY = 'quran-fives-random-ayah-quiz-v1';
export const SURAH_COUNT_QUIZ_STORAGE_KEY = 'quran-fives-surah-count-quiz-v1';
export const PAGE_STARTS_QUIZ_STORAGE_KEY = 'quran-fives-page-starts-quiz-v1';

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
}

export function removeStoredState(storageKey) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage failures so the app keeps working.
  }
}

export function hasStoredState(storageKey) {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
}
