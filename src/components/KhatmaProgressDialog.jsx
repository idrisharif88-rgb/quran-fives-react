import { useEffect } from 'react';
import ModalDialog from './ModalDialog';
import { khatmaProgress, khatmaAverage, KHATMA_TARGET_DAYS } from '../utils/khatmaProgress';
import './KhatmaProgressDialog.css';

const STATUS = {
  done: { label: 'أتممت الختمة — سجّلها', tone: 'good' },
  onTrack: { label: 'في الموعد', tone: 'good' },
  speedUp: { label: 'يحتاج تسريعاً', tone: 'warn' },
  atRisk: { label: 'خطر التأخّر', tone: 'bad' },
  late: { label: `تجاوزت ${KHATMA_TARGET_DAYS} أيام`, tone: 'bad' },
};

const one = (n) => n.toFixed(1).replace(/\.0$/, '');

/**
 * تقدّم الختمة الجارية (حدّها عشرة أيام) ومعدّل الختمات منذ 13 ذي الحجة 1447.
 * نافذة حاجبة: لا يُلمس ما خلفها حتى تُغلق.
 * @param khatmas  الختمات المسجّلة [{ timestamp }]
 * @param page     قيمة العدّاد (الصفحة الجارية)
 * @param today    مفتاح اليوم
 * @param backRef  يُملأ بدالّة الإغلاق ما دامت مفتوحة، لزرّ الرجوع في الهاتف
 */
export default function KhatmaProgressDialog({ khatmas, page, today, onClose, backRef }) {
  useEffect(() => {
    if (!backRef) return undefined;
    backRef.current = onClose;
    return () => { if (backRef.current === onClose) backRef.current = null; };
  }, [backRef, onClose]);

  const timestamps = khatmas.map((k) => k.timestamp).filter(Number.isFinite);
  const lastKhatmaAt = timestamps.length ? Math.max(...timestamps) : null;
  const p = khatmaProgress({ lastKhatmaAt, page, today });
  const avg = khatmaAverage({ timestamps, today });
  const status = STATUS[p.status];

  const rows = [
    ['اليوم', p.dayNumber === 0 ? 'يبدأ اليوم الأوّل غداً' : `${p.dayNumber} من ${KHATMA_TARGET_DAYS}`],
    ['الأجزاء المقروءة', one(p.read)],
    ['الأجزاء المتبقية', one(p.left)],
    ['الأيام المتبقية', Math.max(0, p.daysLeft)],
    ['المطلوب يومياً', p.rate === null ? '—' : `${one(p.rate)} جزء`],
  ];

  return (
    <ModalDialog title="تقدّم الختمة" onClose={onClose} size="sm" className="khatma-progress">
      <div className={`khatma-progress-status ${status.tone}`}>{status.label}</div>
      <dl className="khatma-progress-rows">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="khatma-progress-average">
        <span>معدّل الختمات منذ 13 ذي الحجة 1447</span>
        {avg.average === null
          ? <strong>لا ختمة مسجّلة بعد</strong>
          : <strong>ختمة كل {one(avg.average)} يوم</strong>}
        <span>{avg.count} ختمة في {avg.days} يوماً</span>
      </div>
      <button type="button" className="khatma-progress-close" onClick={onClose}>إغلاق</button>
    </ModalDialog>
  );
}
