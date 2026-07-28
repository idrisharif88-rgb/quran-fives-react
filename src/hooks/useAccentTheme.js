import { useEffect, useState } from 'react';
import { DEFAULT_ACCENT_THEME, isValidAccentTheme } from '../constants/themes';

// حالة لون التطبيق (أخضر/ذهبي) مع التحقّق من القيمة المحفوظة.
// نضع اللون على <body> أيضاً كي تطاله الطبقات المثبّتة خارج .app-container إن وُجدت.
export default function useAccentTheme(persistedValue) {
  const [accentTheme, setAccentTheme] = useState(() => (
    isValidAccentTheme(persistedValue) ? persistedValue : DEFAULT_ACCENT_THEME
  ));

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.dataset.accent = accentTheme;
  }, [accentTheme]);

  return [accentTheme, setAccentTheme];
}
