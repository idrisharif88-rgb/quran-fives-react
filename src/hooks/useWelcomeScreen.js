import { useCallback, useState } from 'react';

// تفضيل جهاز: «ابدأ بدون حساب» مرّة تكفي، فلا تعود شاشة الترحيب في كل فتح
const WELCOME_DONE_KEY = 'quran-fives-welcome-done-v1';

const readDone = () => {
  try { return localStorage.getItem(WELCOME_DONE_KEY) === '1'; } catch { return false; }
};

/**
 * شاشة الترحيب: تظهر لغير الداخل ما لم يختر «ابدأ بدون حساب».
 * خماسيات تعمل بلا حساب (خلافاً لدفتر البقالة)، فالحساب هنا اختيار لا شرط.
 */
export default function useWelcomeScreen(signedIn) {
  const [done, setDone] = useState(readDone);

  const skip = useCallback(() => {
    try { localStorage.setItem(WELCOME_DONE_KEY, '1'); } catch { /* يكفي إخفاؤها في هذه الجلسة */ }
    setDone(true);
  }, []);

  return { open: !signedIn && !done, skip };
}
