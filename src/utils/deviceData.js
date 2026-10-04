import {
  APP_STORAGE_KEY,
  KHMASIYAT_QUIZ_STORAGE_KEY,
  RANDOM_AYAH_QUIZ_STORAGE_KEY,
  SURAH_COUNT_QUIZ_STORAGE_KEY,
  PAGE_STARTS_QUIZ_STORAGE_KEY,
  removeStoredState,
} from './persistence';
import { clearSyncMeta } from './syncMeta';
import { saveAccountStatus } from './syncAccount';

// كل ما يحفظه التطبيق عن المستخدم على هذا الجهاز (عدا بيانات الدخول نفسها)
export const SESSION_STORAGE_KEYS = [
  APP_STORAGE_KEY,
  KHMASIYAT_QUIZ_STORAGE_KEY,
  RANDOM_AYAH_QUIZ_STORAGE_KEY,
  SURAH_COUNT_QUIZ_STORAGE_KEY,
  PAGE_STARTS_QUIZ_STORAGE_KEY,
  'quran_fives_surah_names_quiz_state',
];
const KHITMA_CACHE_KEY = 'quran-fives-khitma-cache-v1';

// تسجيل الخروج: لا يبقى من بيانات الحساب شيء على الجهاز. تعود كلّها من السحابة
// عند الدخول التالي. تسجيلات الحفظ الصوتية ملفّات على الجهاز لا تُزامَن، فلا تُمسّ.
export function wipeDeviceData() {
  SESSION_STORAGE_KEYS.forEach(removeStoredState);
  removeStoredState(KHITMA_CACHE_KEY);
  clearSyncMeta();
  saveAccountStatus(null);
}

const isEmpty = (v) => v == null || (Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0);

/**
 * هل الحالة المحلية بلا محتوى للمستخدم؟ (جهاز جديد، أو بعد تسجيل خروج)
 * عندها تُنزَّل نسخة السحابة عند الدخول بلا سؤال، ويُسمح بالخروج بلا رفع.
 * التفضيلات (الخطّ، الوضع الليلي، القارئ، الخطوة) ليست محتوى فلا تُحتسب.
 */
export function isPristineState(state) {
  if (!state) return true;
  return !state.currentIndex
    && !state.currentPageIndex
    && !state.currentPageEndIndex
    && (state.mushafPage ?? 1) <= 1
    && Object.values(state.starredByStep || {}).every(isEmpty)
    && isEmpty(state.starredIndices)
    && isEmpty(state.starredPages)
    && isEmpty(state.starredPageEnds)
    && isEmpty(state.quranicWondersNotes)
    && isEmpty(state.verseNotes)
    && isEmpty(state.sessions)
    && !state.hifz
    && isEmpty(state.hifzContacts?.contacts)
    && (state.nightCounters || []).every(c => !c.value)
    && state.stopwatchBestAvgMs == null
    && state.stopwatchBestJuzMs == null
    && !state.activeAyahTest
    && !state.activePageStartsTest;
}
