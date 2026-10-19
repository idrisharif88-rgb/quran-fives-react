import { useEffect } from 'react';
import ModalDialog from '../ModalDialog';
import './ContactUs.css';

// أرقام يمنية (+967): رابط واتساب والاتصال يحتاجان رمز الدولة
const CONTACTS = [
  {
    id: 'email',
    label: 'البريد',
    value: 'q.fives.app@gmail.com',
    href: 'mailto:q.fives.app@gmail.com',
    icon: <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />,
  },
  {
    id: 'whatsapp',
    label: 'واتساب',
    value: '779412972',
    href: 'https://wa.me/967779412972',
    icon: <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.4z" />,
  },
  {
    id: 'call',
    label: 'اتصال',
    value: '781215102',
    href: 'tel:+967781215102',
    icon: <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" />,
  },
];

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
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">{c.icon}</svg>
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
