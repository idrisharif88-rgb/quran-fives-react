// ألوان التطبيق المتاحة. اللون مستقلّ تماماً عن الوضع الليلي،
// فتتكوّن أربع تشكيلات: أخضر-نهاري، أخضر-ليلي، ذهبي-نهاري، ذهبي-ليلي.
// تعريف ألوان كلّ تشكيلة في src/styles/themes.css.

export const ACCENT_THEMES = {
  GREEN: 'green',
  YELLOW: 'yellow',
};

export const DEFAULT_ACCENT_THEME = ACCENT_THEMES.GREEN;

const ACCENT_THEME_VALUES = Object.values(ACCENT_THEMES);

export const isValidAccentTheme = value => ACCENT_THEME_VALUES.includes(value);

// نص الزرّ في قائمة «المزيد»
export const ACCENT_THEME_LABEL = 'اللون الذهبي';

// خلفية الصفحة خلف الحاوية: تُضبط على <html> وعلى meta[theme-color]
// (شريط النظام في أندرويد)، ولا بدّ أن تطابق القيم في styles/themes.css.
export const PAGE_BG = {
  night: '#0c1116',
  [ACCENT_THEMES.GREEN]: '#f4f6f8',
  [ACCENT_THEMES.YELLOW]: '#f8f6f0',
};

export const getPageBg = (isNightMode, accentTheme) => (
  isNightMode ? PAGE_BG.night : (PAGE_BG[accentTheme] ?? PAGE_BG[DEFAULT_ACCENT_THEME])
);
