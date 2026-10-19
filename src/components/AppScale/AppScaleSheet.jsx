import { useEffect, useMemo } from 'react';
import ModalDialog from '../ModalDialog';
import { scaleSteps, DEFAULT_SCALE } from '../../utils/appScale';
import './AppScaleSheet.css';

const toArabicDigits = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

/**
 * «حجم العرض»: شريط بدرجات ومعاينة فوقه. التطبيق كلّه — والنافذة نفسها — يتغيّر فور التحريك.
 * @param backRef يضع فيه الإغلاق لزرّ الرجوع
 */
export default function AppScaleSheet({ scale, onChange, onClose, backRef }) {
  // الدرجات حسب عرض الجهاز: الهاتف حتى 115، واللوح حتى 170
  const steps = useMemo(() => scaleSteps(), []);
  const last = steps.length - 1;
  const index = Math.max(0, steps.indexOf(scale));

  useEffect(() => {
    if (!backRef) return undefined;
    backRef.current = onClose;
    return () => { if (backRef.current === onClose) backRef.current = null; };
  }, [backRef, onClose]);

  const step = (delta) => onChange(steps[Math.min(last, Math.max(0, index + delta))]);

  return (
    <ModalDialog title="حجم العرض" onClose={onClose} size="sm" className="app-scale-dialog">
      <div className="app-scale-preview" aria-hidden="true">
        <p className="app-scale-verse">﴿إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ﴾</p>
        <div className="app-scale-preview-row">
          <span className="app-scale-chip">الإسراء ٩</span>
          <span className="app-scale-dot">٥</span>
        </div>
      </div>

      <div className="app-scale-slider" dir="ltr">
        <button type="button" className="app-scale-end small" onClick={() => step(-1)} disabled={index === 0} aria-label="أصغر">ا</button>
        <div className="app-scale-track">
          <div className="app-scale-ticks">
            {steps.map((s, i) => <span key={s} className={i <= index ? 'on' : ''} />)}
          </div>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={index}
            onChange={(e) => onChange(steps[Number(e.target.value)])}
            aria-label="حجم العرض"
            aria-valuetext={`${scale}%`}
            style={{ '--fill': `${(index / last) * 100}%` }}
          />
        </div>
        <button type="button" className="app-scale-end large" onClick={() => step(1)} disabled={index === last} aria-label="أكبر">ا</button>
      </div>

      <div className="app-scale-foot">
        <span className="app-scale-value">{toArabicDigits(scale)}٪</span>
        <button type="button" className="app-scale-reset" onClick={() => onChange(DEFAULT_SCALE)} disabled={scale === DEFAULT_SCALE}>
          حجم الهاتف
        </button>
      </div>
    </ModalDialog>
  );
}
