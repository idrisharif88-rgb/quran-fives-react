import { useState, useEffect } from 'react';
import { APPS, contactUrl } from '../../utils/hifzContacts';
import { surahName } from './hifzText';
import './HifzContacts.css';

const APP_LABEL = { [APPS.WHATSAPP]: 'واتساب', [APPS.TELEGRAM]: 'تلجرام' };

const AppIcon = ({ app }) => (app === APPS.TELEGRAM ? (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M21.9 4.3 18.8 19c-.2 1-.9 1.300-1.800.8l-4.800-3.500-2.300 2.200c-.3.3-.5.5-1 .5l.3-4.900 9-8.100c.4-.3-.1-.5-.6-.2L6.500 12.800l-4.800-1.500c-1-.3-1-1 .2-1.500L20.600 2.600c.9-.3 1.600.2 1.300 1.700z"/></svg>
) : (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.600 15.100L2 22l5-1.300A10 10 0 1 0 12 2zm5.800 14.200c-.2.700-1.400 1.300-1.900 1.400-.500.100-1.100.100-1.800-.100-.400-.100-.9-.300-1.600-.600-2.800-1.200-4.600-4-4.800-4.200-.100-.200-1.100-1.500-1.100-2.900s.7-2 1-2.300c.2-.300.500-.300.700-.300h.5c.2 0 .4-.100.600.500.200.600.800 2 .900 2.100.100.200.100.300 0 .500-.100.200-.100.300-.300.500l-.400.500c-.100.100-.300.300-.100.600.200.300.800 1.300 1.700 2.100 1.200 1 2.100 1.400 2.400 1.500.300.100.500.100.600-.100.200-.200.700-.800.900-1.100.200-.300.400-.200.600-.100.300.100 1.700.800 2 .900.300.200.500.200.500.400.100.100.100.700-.100 1.300z"/></svg>
));

// نموذج إضافة شيخ — مثبّت في أعلى الشاشة كي لا تغطّي لوحة المفاتيح حقوله
function AddContactForm({ onAdd, onCancel }) {
  const [name, setName] = useState('');
  const [app, setApp] = useState(APPS.WHATSAPP);
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (onAdd({ name, app, handle })) return;
    setError(app === APPS.WHATSAPP
      ? 'اكتب الاسم ورقم الواتساب كاملاً مع مفتاح الدولة (مثل 9665xxxxxxxx)'
      : 'اكتب الاسم واسم المستخدم في تلجرام (مثل sheikh_ali) أو رقمه الدولي');
  };

  return (
    <div className="hifz-contact-overlay" onMouseDown={onCancel}>
      <div className="hifz-contact-form" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="hifz-contact-form-head">
          <span>إضافة شيخ</span>
          <div className="hifz-contact-form-actions">
            <button type="button" className="hifz-btn" onClick={onCancel}>إلغاء</button>
            <button type="button" className="hifz-btn primary" onClick={submit}>حفظ</button>
          </div>
        </div>
        <input className="hifz-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الشيخ" autoFocus />
        <div className="hifz-contact-apps">
          {[APPS.WHATSAPP, APPS.TELEGRAM].map((id) => (
            <button key={id} type="button" className={`hifz-contact-app ${app === id ? 'active' : ''}`.trim()} onClick={() => { setApp(id); setError(''); }}>
              <AppIcon app={id} /> {APP_LABEL[id]}
            </button>
          ))}
        </div>
        <input
          className="hifz-input"
          dir="ltr"
          inputMode={app === APPS.WHATSAPP ? 'tel' : 'text'}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder={app === APPS.WHATSAPP ? '9665xxxxxxxx' : 'username'}
        />
        {error && <p className="hifz-contact-error">{error}</p>}
      </div>
    </div>
  );
}

/**
 * خطّ التواصل مع الشيخ في خطوة «تأكيد الحافظ»: ضغطة على الشيخ تفتح محادثته في واتساب
 * أو تلجرام برسالة جاهزة، ثم تبقى الخطوة بانتظار تأكيده.
 * @param contacts ما يعيده useHifzContacts
 * @param verse    { index, ref: { s, a } } الآية الجارية
 * @param backRef  زرّ الرجوع يغلق نموذج الإضافة أولاً ما دام مفتوحاً
 */
export default function HifzContacts({ contacts, verse, backRef }) {
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (!backRef || !isAdding) return undefined;
    const close = () => setIsAdding(false);
    backRef.current = close;
    return () => { if (backRef.current === close) backRef.current = null; };
  }, [backRef, isAdding]);

  const { state, add, remove, markAsked } = contacts;
  const waiting = state.askedIndex === verse.index;

  const open = (contact) => {
    const message = `السلام عليكم ورحمة الله وبركاته، أريد أن أقرأ عليكم سورة ${surahName(verse.ref.s)} الآية ${verse.ref.a} للتأكد من صحة قراءتي.`;
    window.open(contactUrl(contact, message), '_blank');
    markAsked(verse.index);
  };

  return (
    <div className="hifz-contacts">
      {state.contacts.length === 0 && <p className="hifz-tool-note">أضف شيخاً لتتواصل معه مباشرة من هنا.</p>}
      {state.contacts.map((contact) => (
        <div className="hifz-contact" key={contact.id}>
          <button type="button" className={`hifz-contact-open ${contact.app}`} onClick={() => open(contact)}>
            <AppIcon app={contact.app} />
            <span>{contact.name}</span>
          </button>
          {removingId === contact.id ? (
            <button type="button" className="hifz-btn danger" onClick={() => { remove(contact.id); setRemovingId(null); }}>حذف؟</button>
          ) : (
            <button type="button" className="hifz-contact-remove" onClick={() => setRemovingId(contact.id)} aria-label={`حذف ${contact.name}`}>×</button>
          )}
        </div>
      ))}
      <button type="button" className="hifz-link" onClick={() => setIsAdding(true)}>+ إضافة شيخ</button>
      {waiting && <p className="hifz-waiting">تم فتح المحادثة — بانتظار تأكيد الشيخ. عند تأكيده اضغط الزرّ أدناه.</p>}
      {isAdding && <AddContactForm onAdd={(draft) => { const ok = add(draft); if (ok) setIsAdding(false); return ok; }} onCancel={() => setIsAdding(false)} />}
    </div>
  );
}
