import { useState } from 'react';
import { MAX_JUMP } from '../../utils/hifzTrial';
import './HifzTrialBar.css';

const Icon = ({ d, size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d={d} /></svg>
);
// في RTL يتقدّم الزمن نحو اليسار
const NEXT = 'M6 6h2v12H6zm3.5 6 8.5 6V6z';
const JUMP = 'M11 18V6l-8.5 6zm.5-6 8.5 6V6z';
const END = 'M7 7h10v10H7z';

/**
 * أدوات وضع التجربة: صفّ تحت عنوان شاشة الحفظ بأيقونات مستديرة كأيقونات التطبيق الرئيسية،
 * تحت كل منها اسمها — اليوم التالي، القفز، إنهاء التجربة.
 * القفز يفتح تحتها خانة عدد الأيام (1 إلى MAX_JUMP)؛ كل يوم مقفوز يُتمّ كاملاً.
 * @param canAdvance برنامج التجربة بدأ (فلليوم التالي وللقفز معنى)
 */
export default function HifzTrialBar({ canAdvance, onNextDay, onJump, onEnd }) {
  const [jumping, setJumping] = useState(false);
  const [days, setDays] = useState('');
  const count = Number(days);
  const valid = Number.isInteger(count) && count >= 1 && count <= MAX_JUMP;
  const jump = (e) => {
    e.preventDefault();
    if (!valid) return;
    setJumping(false);
    setDays('');
    onJump(count);
  };

  return (
    <div className="hifz-trial">
      <div className="hifz-trial-row">
        <button type="button" className="hifz-trial-icon" onClick={onNextDay} disabled={!canAdvance}>
          <span className="hifz-trial-circle"><Icon d={NEXT} /></span>
          <span className="hifz-trial-label">اليوم التالي</span>
        </button>
        <button type="button" className={`hifz-trial-icon ${jumping ? 'active' : ''}`.trim()} onClick={() => setJumping((v) => !v)} disabled={!canAdvance} aria-expanded={jumping}>
          <span className="hifz-trial-circle"><Icon d={JUMP} /></span>
          <span className="hifz-trial-label">قفز أيام</span>
        </button>
        <button type="button" className="hifz-trial-icon end" onClick={onEnd}>
          <span className="hifz-trial-circle"><Icon d={END} size={18} /></span>
          <span className="hifz-trial-label">إنهاء التجربة</span>
        </button>
      </div>
      {jumping && (
        <form className="hifz-trial-jump" onSubmit={jump}>
          <label htmlFor="hifz-trial-days">كم يوماً؟</label>
          <input
            id="hifz-trial-days"
            type="number"
            inputMode="numeric"
            min="1"
            max={MAX_JUMP}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder={`1 – ${MAX_JUMP}`}
            autoFocus
          />
          <button type="submit" disabled={!valid}>قفز</button>
        </form>
      )}
    </div>
  );
}
