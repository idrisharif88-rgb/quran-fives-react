import { useEffect } from 'react';
import HifzFivesScreen from './HifzFivesScreen';

/**
 * أداة خطوة الحفظ. «طريقة الخماسيات» تفتح نافذة كاملة (HifzFivesScreen) تقود الحافظ في
 * ورد اليوم: كل آية خمس مرات غيباً، ثم مع ما قبلها خمساً، وبعد كل خمس يُسأل عن حفظه.
 * إتمامها لا يُتمّ الخطوة: يظهر زرّ تأكيد. ومن شاء أتمّ الخطوة بـ«تم» بلا الطريقة.
 * @param refs         آيات الورد [{ s, a }]
 * @param reciter      المقرئ المختار (تلاوة المقطع داخل الطريقة)
 * @param linkRef      آخر آية من الأمس لمرحلة «الربط»، أو null
 * @param method       { taps, checked } التقدّم في الطريقة لهذا الورد
 * @param open         الطريقة مفتوحة — الشاشة تغطّي نصّ الورد ما دامت كذلك
 * @param onTap        (delta | 'reset') ← يعدّ، onAnswer (نعم: true) ← جواب السؤال
 * @param onDone       يُتمّ خطوة الحفظ
 */
export default function HifzMethodTool({ refs, linkRef, reciter, method, open, onOpenChange, onTap, onAnswer, onDone }) {
  // الخروج من الخطوة يغلق الطريقة (ويكشف النصّ)
  useEffect(() => () => onOpenChange(false), [onOpenChange]);

  return (
    <>
      <div className="hifz-tool">
        <button type="button" className="hifz-btn primary" onClick={() => onOpenChange(true)}>
          {method.taps > 0 ? 'متابعة طريقة الخماسيات' : 'طريقة الخماسيات'}
        </button>
        <button type="button" className="hifz-btn" onClick={onDone}>تم</button>
      </div>
      {open && (
        <HifzFivesScreen
          refs={refs}
          linkRef={linkRef}
          reciter={reciter}
          method={method}
          onTap={onTap}
          onAnswer={onAnswer}
          onDone={onDone}
          onClose={() => onOpenChange(false)}
        />
      )}
    </>
  );
}
