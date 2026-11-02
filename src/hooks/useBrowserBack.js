import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const GUARD = 'quran-fives-back-guard';
const FULL = 16;
const TOP_UP_BELOW = 8;
const LEAVE_WAIT_MS = 500;

const depth = () => Number(window.history.state?.[GUARD]) || 0;

// مداخل حارسة فوق الصفحة في سجلّ المتصفح. تُملأ مع لمسة المستخدم دفعة واحدة، فكل رجوع ينزل مدخلاً
// ولا يحتاج إلى إضافة جديد: Chrome يتخطّى ما أُضيف بلا تفاعل، فكانت الرجعة الثانية تغادر الموقع.
function fill() {
  try {
    for (let i = depth() + 1; i <= FULL; i++) window.history.pushState({ [GUARD]: i }, '');
  } catch { /* Safari يحدّ عدد الإضافات: يُكمل عند اللمسة التالية */ }
}

/**
 * زر الرجوع في المتصفح هو زر الهاتف نفسه: handleHardwareBack يغلق الطبقة العليا،
 * وعلى الشاشة الرئيسية يعرض تأكيد الخروج.
 */
export default function useBrowserBack(backHandlerRef) {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return undefined;
    let last = depth();
    const onInput = () => { if (depth() < TOP_UP_BELOW) fill(); last = depth(); };
    const onPop = () => {
      const now = depth();
      const forward = now > last;
      last = now;
      if (forward) return;
      backHandlerRef.current?.();
      if (now === 0) { fill(); last = depth(); }
    };
    fill();
    last = depth();
    window.addEventListener('pointerdown', onInput, true);
    window.addEventListener('keydown', onInput, true);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('pointerdown', onInput, true);
      window.removeEventListener('keydown', onInput, true);
      window.removeEventListener('popstate', onPop);
    };
  }, [backHandlerRef]);
}

// زرّ «خروج»: يرجع إلى ما قبل الموقع. لسان بلا صفحة سابقة لا يتحرّك، فتُفتح صفحة فارغة بدل زرّ لا يفعل شيئاً.
export function leaveSite() {
  const timer = setTimeout(() => {
    window.close();
    window.location.replace('about:blank');
  }, LEAVE_WAIT_MS);
  window.addEventListener('pagehide', () => clearTimeout(timer), { once: true });
  window.history.go(-(depth() + 1));
}
