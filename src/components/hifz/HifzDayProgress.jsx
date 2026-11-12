import { dayProgress } from '../../utils/hifzStepNav';
import './HifzDayProgress.css';

/**
 * شريط تقدّم اليوم: قطعة لكل خطوة من خطوات الورد، ثم قطعة لكل صندوق مراجعة فيه آيات.
 * يبقى أعلى الصفحة أثناء التمرير.
 */
export default function HifzDayProgress({ program, plan }) {
  const { steps, boxes, done, total, percent } = dayProgress(program, plan);
  if (total === 0) return null;
  return (
    <div className="hifz-dayprog" role="progressbar" aria-label="تقدّم اليوم" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
      <div className="hifz-dayprog-row">
        <span>تقدّم اليوم</span>
        <b><bdi>{done} من {total}</bdi> · <bdi dir="ltr">{percent}%</bdi></b>
      </div>
      <div className="hifz-dayprog-segs">
        {steps.map((on, i) => <i key={`s${i}`} className={on ? 'on' : ''} />)}
        {steps.length > 0 && boxes.length > 0 && <i className="gap" />}
        {boxes.map((on, i) => <i key={`b${i}`} className={on ? 'on' : ''} />)}
      </div>
      <div className="hifz-dayprog-row small">
        {steps.length > 0 && <span>الحفظ</span>}
        {boxes.length > 0 && <span>المراجعة</span>}
      </div>
    </div>
  );
}
