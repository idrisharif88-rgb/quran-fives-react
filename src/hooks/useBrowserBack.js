import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const GUARD = 'quran-fives-back-guard';

/**
 * زر الرجوع في المتصفح يسلك مسلك زر الهاتف: يغلق الطبقة العليا (handleHardwareBack).
 * مدخل حارس في سجلّ المتصفح يُمسك الرجوع؛ وعلى الشاشة الرئيسية (false) يُترك المتصفح يغادر الموقع.
 * الحارس يُوضع مع لمسة المستخدم لا عند التحميل: Chrome يتخطّى مدخلاً أُضيف بلا تفاعل، ولا يُحبس الزائر.
 */
export default function useBrowserBack(backHandlerRef) {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return undefined;
    const arm = () => {
      if (!window.history.state?.[GUARD]) window.history.pushState({ [GUARD]: true }, '');
    };
    const onPop = (event) => {
      if (event.state?.[GUARD]) return;   // زر التقدّم
      if (backHandlerRef.current?.()) arm();
      else window.history.back();
    };
    window.addEventListener('pointerdown', arm, true);
    window.addEventListener('keydown', arm, true);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('pointerdown', arm, true);
      window.removeEventListener('keydown', arm, true);
      window.removeEventListener('popstate', onPop);
    };
  }, [backHandlerRef]);
}
