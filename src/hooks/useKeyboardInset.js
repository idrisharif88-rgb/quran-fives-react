import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

// ارتفاع لوحة المفاتيح المفتوحة (بكسل). طبقة ثابتة (position: fixed) لا تتقلّص مع الصفحة حين
// تُفتح اللوحة، فتأخذ هذا الارتفاع حشواً سفلياً كي يبقى ما يُكتب فوقها.
// على الهاتف من إضافة Keyboard، وفي المتصفح من visualViewport.
export default function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const handles = [
        Keyboard.addListener('keyboardWillShow', (info) => setInset(info?.keyboardHeight || 0)),
        Keyboard.addListener('keyboardWillHide', () => setInset(0)),
      ];
      return () => handles.forEach((h) => h.then((l) => l.remove()).catch(() => {}));
    }
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);

  return inset;
}

// يُظهر الحقل الذي يُكتب فيه بعد أن تأخذ اللوحة مكانها
export function revealOnFocus(event) {
  const field = event.currentTarget;
  setTimeout(() => field.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
}
