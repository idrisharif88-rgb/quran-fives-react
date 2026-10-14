import { useEffect } from 'react';
import ModalDialog from './ModalDialog';
import './CelebrationDialog.css';

const Star = () => (
  <svg viewBox="0 0 24 24" width="46" height="46" fill="currentColor" aria-hidden="true"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
);

/**
 * نافذة تهنئة بإتمام شيء (اختبار، محطّة منه، ختمة): نجمة وعنوان ونصّ وأرقام وزرّان.
 * @param message        سطر التهنئة
 * @param stats          [{ label, value, tone? }] أرقام تُعرض في صفّ — tone: 'good' | 'bad'
 * @param primaryLabel   زرّ العمل الأساسي و onPrimary ما يفعله
 * @param secondaryLabel زرّ ثانٍ يغلق النافذة (اختياري)
 * @param backRef        يُملأ بدالّة الإغلاق ما دامت مفتوحة، ليغلقها زرّ الرجوع في الهاتف
 */
export default function CelebrationDialog({ title, message, stats = [], primaryLabel, onPrimary, secondaryLabel, onClose, backRef }) {
  useEffect(() => {
    if (!backRef) return undefined;
    backRef.current = onClose;
    return () => { if (backRef.current === onClose) backRef.current = null; };
  }, [backRef, onClose]);

  return (
    <ModalDialog title={title} onClose={onClose} size="sm" className="celebration-dialog">
      <div className="celebration-star"><Star /></div>
      <p className="celebration-message">{message}</p>
      {stats.length > 0 && (
        <div className="celebration-stats">
          {stats.map((stat) => (
            <div key={stat.label} className={stat.tone || ''}>
              <strong dir="ltr">{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="celebration-actions">
        <button type="button" className="celebration-btn primary" onClick={onPrimary}>{primaryLabel}</button>
        {secondaryLabel && <button type="button" className="celebration-btn" onClick={onClose}>{secondaryLabel}</button>}
      </div>
    </ModalDialog>
  );
}
