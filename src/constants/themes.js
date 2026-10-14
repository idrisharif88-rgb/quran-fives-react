// ألوان التطبيق المتاحة. اللون مستقلّ تماماً عن الوضع الليلي،
// فتتكوّن ستّ تشكيلات: أخضر وذهبي وبرتقالي، لكلّ منها نهاري وليلي.
// تعريف ألوان كلّ تشكيلة في src/styles/themes.css.

export const ACCENT_THEMES = {
  GREEN: 'green',
  YELLOW: 'yellow',
  ORANGE: 'orange',
};

export const DEFAULT_ACCENT_THEME = ACCENT_THEMES.GREEN;

const ACCENT_THEME_VALUES = Object.values(ACCENT_THEMES);

export const isValidAccentTheme = value => ACCENT_THEME_VALUES.includes(value);

// نص الزرّ في قائمة «المزيد»: كل ضغطة تنقل إلى اللون التالي
export const ACCENT_THEME_LABEL = 'لون التطبيق';
export const ACCENT_THEME_NAMES = {
  [ACCENT_THEMES.GREEN]: 'أخضر',
  [ACCENT_THEMES.YELLOW]: 'ذهبي',
  [ACCENT_THEMES.ORANGE]: 'برتقالي',
};

// أخضر ← ذهبي ← برتقالي ← أخضر
export const nextAccentTheme = (current) => (
  ACCENT_THEME_VALUES[(ACCENT_THEME_VALUES.indexOf(current) + 1) % ACCENT_THEME_VALUES.length]
);

// خلفية الصفحة خلف الحاوية: تُضبط على <html> وعلى meta[theme-color]
// (شريط النظام في أندرويد)، ولا بدّ أن تطابق القيم في styles/themes.css.
export const PAGE_BG = {
  night: '#0c1116',
  [ACCENT_THEMES.GREEN]: '#f4f6f8',
  [ACCENT_THEMES.YELLOW]: '#f8f6f0',
  [ACCENT_THEMES.ORANGE]: '#f8f5f2',
};

export const getPageBg = (isNightMode, accentTheme) => (
  isNightMode ? PAGE_BG.night : (PAGE_BG[accentTheme] ?? PAGE_BG[DEFAULT_ACCENT_THEME])
);
