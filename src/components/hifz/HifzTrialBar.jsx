import './HifzTrialBar.css';

/**
 * شريط وضع التجربة تحت عنوان شاشة الحفظ.
 * @param canAdvance برنامج التجربة بدأ (فلليوم التالي معنى)
 */
export default function HifzTrialBar({ canAdvance, onNextDay, onEnd }) {
  return (
    <div className="hifz-trial-bar" role="status">
      <div className="hifz-trial-text">
        <strong>وضع التجربة</strong>
        <span>لا يُحفظ في حسابك</span>
      </div>
      <button type="button" className="hifz-trial-btn" onClick={onNextDay} disabled={!canAdvance}>اليوم التالي</button>
      <button type="button" className="hifz-trial-btn outline" onClick={onEnd}>إنهاء التجربة</button>
    </div>
  );
}
