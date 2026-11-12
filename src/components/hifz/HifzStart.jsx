import { useState } from 'react';
import HifzCustomStart from './HifzCustomStart';
import { DIRECTIONS, VERSES_PER_DAY_CHOICES } from '../../utils/hifzSchedule';

const perDayLabel = (n) => (n === 1 ? 'آية واحدة' : `${n} آيات`);

// بدء البرنامج: ورد اليوم (آية أو 3 أو 5 أو 7) ثم نقطة البداية (أول المصحف أو آخره،
// أو آية يختارها من أذن له المشرف)
export default function HifzStart({ onStart, canCustomStart, onTrialStart }) {
  const [perDay, setPerDay] = useState(VERSES_PER_DAY_CHOICES[0]);
  return (
    <div className="hifz-start">
      <h3>كم آية تحفظ في اليوم؟</h3>
      <div className="hifz-start-perday" role="radiogroup" aria-label="عدد آيات اليوم">
        {VERSES_PER_DAY_CHOICES.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={perDay === n}
            className={`hifz-start-chip ${perDay === n ? 'active' : ''}`.trim()}
            onClick={() => setPerDay(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <h3>من أين تبدأ الحفظ؟</h3>
      <button type="button" className="hifz-start-option" onClick={() => onStart(DIRECTIONS.FORWARD, perDay)}>
        <strong>من أول المصحف</strong>
        <span>الصفحة 1 — من الفاتحة إلى الناس</span>
      </button>
      <button type="button" className="hifz-start-option" onClick={() => onStart(DIRECTIONS.BACKWARD, perDay)}>
        <strong>من آخر المصحف</strong>
        <span>الصفحة 604 — من الناس إلى الفاتحة، وآيات كل سورة بترتيبها</span>
      </button>
      {canCustomStart && <HifzCustomStart onStart={(origin, direction) => onStart(direction, perDay, origin)} />}
      <p className="hifz-start-note">{perDayLabel(perDay)} في اليوم، ثم مراجعة ما حُفظ.</p>
      {onTrialStart && <button type="button" className="hifz-link" onClick={onTrialStart}>وضع التجربة (للمشرف)</button>}
    </div>
  );
}
