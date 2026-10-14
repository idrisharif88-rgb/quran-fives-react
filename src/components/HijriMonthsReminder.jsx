import { useEffect } from 'react';
import './HijriMonthsReminder.css';

/**
 * تنبيه صغير للمشرف أعلى الشاشة (إضافة أهلّة، أو هلال بين الرابعة والخامسة). لا يحجب ما خلفه.
 * @param onClose    إغلاق حتى الشهر الهجري التالي
 * @param onPostpone تأجيل حتى الغد (وكذلك زرّ الرجوع في الهاتف)
 */
export default function HijriMonthsReminder({ message, onClose, onPostpone, backRef }) {
  useEffect(() => {
    if (!backRef) return undefined;
    backRef.current = onPostpone;
    return () => { if (backRef.current === onPostpone) backRef.current = null; };
  }, [backRef, onPostpone]);

  return (
    <div className="hijri-reminder" role="status" dir="rtl">
      <span className="hijri-reminder-text">{message}</span>
      <button type="button" className="hijri-reminder-btn primary" onClick={onClose}>إغلاق</button>
      <button type="button" className="hijri-reminder-btn" onClick={onPostpone}>تأجيل</button>
    </div>
  );
}
