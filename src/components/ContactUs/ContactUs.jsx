import { useEffect } from 'react';
import ModalDialog from '../ModalDialog';
import { CONTACTS } from '../../constants/contacts';
import './ContactUs.css';

/**
 * «تواصل معنا»: البريد وواتساب والاتصال (كل سطر يفتح تطبيقه)، واسم المطوّر، ثم طلب الدعاء.
 * @param backRef يضع فيه الإغلاق لزرّ الرجوع
 */
export default function ContactUs({ onClose, backRef }) {
  useEffect(() => {
    if (!backRef) return undefined;
    backRef.current = onClose;
    return () => { if (backRef.current === onClose) backRef.current = null; };
  }, [backRef, onClose]);

  return (
    <ModalDialog title="تواصل معنا" onClose={onClose} size="sm" className="contact-dialog">
      <div className="contact-list" dir="rtl">
        {CONTACTS.map((c) => (
          <a key={c.id} className="contact-row" href={c.href} target="_blank" rel="noreferrer">
            <span className="contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d={c.icon} /></svg>
            </span>
            <span className="contact-text">
              <span className="contact-label">{c.label}</span>
              <span className="contact-value" dir="ltr">{c.value}</span>
            </span>
          </a>
        ))}
        <div className="contact-dev">
          <span className="contact-label">المطوّر</span>
          <strong>إدريس أحمد</strong>
        </div>
      </div>

      <div className="contact-dua" dir="rtl">
        <p>لا تنسونا من صالح دعائكم</p>
        <p>نسأل الله أن يتقبّل هذا العمل خالصاً لوجهه الكريم، وأن ينفع به.</p>
      </div>
    </ModalDialog>
  );
}
