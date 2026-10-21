// سؤال العمر قبل إنشاء الحساب (سياسة العائلات في جوجل بلاي): الحساب يجمع البريد
// والتسجيلات، وجمعها ممّن دون 13 يحتاج موافقة وليّ الأمر. فمن دون 13 يستعمل التطبيق
// كاملاً بلا حساب. السؤال محايد (سنة الميلاد، لا «هل عمرك 13؟»)، وجوابه يُحفظ على
// الجهاز فلا يُعاد بتغيير السنة.

const AGE_GATE_KEY = 'quran-fives-age-gate-v1';
export const MIN_ACCOUNT_AGE = 13;

// بلا شهر الميلاد نأخذ أصغر عمر ممكن: المولود قبل 13 سنة قد لا يكون أتمّها بعد
export function isUnderAge(birthYear, currentYear = new Date().getFullYear()) {
  return currentYear - birthYear - 1 < MIN_ACCOUNT_AGE;
}

// سنوات الاختيار: من هذه السنة إلى مئة سنة مضت
export function birthYears(currentYear = new Date().getFullYear()) {
  return Array.from({ length: 101 }, (_, i) => currentYear - i);
}

// 'adult' | 'child' | null (لم يُسأل بعد)
export function readAgeGate() {
  try {
    const value = localStorage.getItem(AGE_GATE_KEY);
    return value === 'adult' || value === 'child' ? value : null;
  } catch {
    return null;
  }
}

export function saveAgeGate(value) {
  try { localStorage.setItem(AGE_GATE_KEY, value); } catch { /* تجاهل */ }
}

// «أنا وليّ الأمر»: يُعاد السؤال ليجيب عنه الوالد بسنة ميلاده
export function clearAgeGate() {
  try { localStorage.removeItem(AGE_GATE_KEY); } catch { /* تجاهل */ }
}
