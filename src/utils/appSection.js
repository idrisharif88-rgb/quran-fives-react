import { loadStoredState, saveStoredState, removeStoredState } from './persistence';

// قسم التطبيق الذي اختاره المستخدم بعد الدخول: إعداد جهاز، لا يُزامَن ولا يُنسخ.
// يُحفظ مع صاحبه، فلا يرث حساب جديد اختيار حساب سابق على الهاتف نفسه.
const SECTION_KEY = 'quran-fives-app-section-v1';

export const SECTION = { FIVES: 'fives', HIFZ: 'hifz' };

const isSection = (value) => Object.values(SECTION).includes(value);

export const loadSectionChoice = () => loadStoredState(SECTION_KEY);

export function saveSectionChoice(user, section) {
  const choice = { user, section };
  saveStoredState(SECTION_KEY, choice);
  return choice;
}

export const clearSectionChoice = () => removeStoredState(SECTION_KEY);

/** قسم هذا الحساب، أو null إن لم يختر بعد */
export function sectionFor(choice, user) {
  if (!user || choice?.user !== user || !isSection(choice.section)) return null;
  return choice.section;
}
