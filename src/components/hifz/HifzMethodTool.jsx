import { useEffect } from 'react';
import { METHOD_REPS, methodPosition } from '../../utils/hifzMethod';
import { refsText } from './hifzText';

/**
 * أداة خطوة الحفظ. «طريقة الخماسيات» عدّاد يقود الحافظ في ورد اليوم: كل آية خمس مرات
 * غيباً، ثم مع ما قبلها خمساً، وينتقل وحده بعد الخامسة. إتمامها لا يُتمّ الخطوة: يظهر زرّ
 * تأكيد (ضغطة خاطئة تُصحَّح بالإنقاص قبله). ومن شاء أتمّ الخطوة بـ«تم» بلا الطريقة.
 * @param refs         آيات الورد [{ s, a }]
 * @param taps         التكرارات المنجزة في الطريقة لهذا الورد
 * @param open         الطريقة مفتوحة — الشاشة تغطّي نصّ الورد ما دامت كذلك
 * @param onTap        (delta | 'reset') ← يعدّ
 * @param onDone       يُتمّ خطوة الحفظ
 */
export default function HifzMethodTool({ refs, taps, open, onOpenChange, onTap, onDone }) {
  // الخروج من الخطوة يغلق الطريقة (ويكشف النصّ)
  useEffect(() => () => onOpenChange(false), [onOpenChange]);

  if (!open) {
    return (
      <div className="hifz-tool">
        <button type="button" className="hifz-btn primary" onClick={() => onOpenChange(true)}>
          {taps > 0 ? 'متابعة طريقة الخماسيات' : 'طريقة الخماسيات'}
        </button>
        <button type="button" className="hifz-btn" onClick={onDone}>تم</button>
      </div>
    );
  }

  const { done, stage, stageIndex, stageCount, rep } = methodPosition(refs.length, taps);
  const joined = stage.to > stage.from;
  return (
    <>
      <div className="hifz-method-stage">
        <strong>{refsText(refs.slice(stage.from, stage.to + 1))}</strong>
        <span>{joined ? 'اقرأها مجموعةً من حفظك' : 'كرّرها من حفظك'} — المرحلة {stageIndex + 1} من {stageCount}</span>
      </div>
      <div className="hifz-counter">
        <button type="button" className={`hifz-counter-tap ${done ? 'reached' : ''}`.trim()} onClick={() => onTap(1)} disabled={done} aria-label="زيادة العدّاد">
          <strong dir="ltr">{rep}</strong>
          <span dir="ltr">/ {METHOD_REPS}</span>
        </button>
        <div className="hifz-counter-side">
          <button type="button" className="hifz-btn" onClick={() => onTap(-1)} disabled={taps === 0}>− ١</button>
          <button type="button" className="hifz-btn" onClick={() => onTap('reset')} disabled={taps === 0}>من الأوّل</button>
        </div>
      </div>
      {done && <button type="button" className="hifz-btn primary hifz-confirm" onClick={onDone}>تم — أكملت الحفظ</button>}
      <button type="button" className="hifz-link hifz-method-close" onClick={() => onOpenChange(false)}>إغلاق الطريقة</button>
    </>
  );
}
