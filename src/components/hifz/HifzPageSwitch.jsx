import './HifzPageSwitch.css';

const Arrow = ({ next }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={next ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} /></svg>
);

/**
 * التنقّل بين صفحات ورد يمتدّ على أكثر من صفحة (HifzMushafVerses): يمين = السابقة، يسار = التالية،
 * بالسهمين نفسيهما في خطوات الحفظ (HifzSteps).
 * @param pages  أرقام صفحات المصحف بترتيب التلاوة
 * @param at     موضع الصفحة المعروضة فيها، و onChange يغيّره
 */
export default function HifzPageSwitch({ pages, at, onChange }) {
  return (
    <div className="hifz-page-switch" dir="rtl">
      <button type="button" className="hifz-page-switch-arrow" onClick={() => onChange(at - 1)} disabled={at === 0} aria-label="الصفحة السابقة"><Arrow /></button>
      <span>صفحة {pages[at]}</span>
      <button type="button" className="hifz-page-switch-arrow" onClick={() => onChange(at + 1)} disabled={at === pages.length - 1} aria-label="الصفحة التالية"><Arrow next /></button>
    </div>
  );
}
