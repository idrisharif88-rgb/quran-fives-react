// جهات اتصال الحفّاظ (الشيوخ): تُفتح محادثتهم في واتساب أو تلجرام مباشرة.
export const APPS = { WHATSAPP: 'whatsapp', TELEGRAM: 'telegram' };

const digitsOf = (text) => String(text ?? '').replace(/\D/g, '').replace(/^00/, '');

// يُنقّي ما كتبه المستخدم؛ يعيد null إن كان ناقصاً
// واتساب: رقم دولي بلا + ولا أصفار البداية. تلجرام: اسم مستخدم، أو رقم دولي.
export function makeContact({ name, app, handle }) {
  const cleanName = String(name ?? '').trim();
  if (!cleanName) return null;
  if (app === APPS.TELEGRAM) {
    const raw = String(handle ?? '').trim().replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, '');
    const isPhone = /^\+?[\d\s-]+$/.test(raw);
    const value = isPhone ? digitsOf(raw) : raw;
    if (isPhone ? value.length < 8 : !/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(value)) return null;
    return { name: cleanName, app: APPS.TELEGRAM, handle: isPhone ? `+${value}` : value };
  }
  const phone = digitsOf(handle);
  if (phone.length < 8 || phone.length > 15) return null;
  return { name: cleanName, app: APPS.WHATSAPP, handle: phone };
}

// رابط يفتح المحادثة مباشرة، مع رسالة جاهزة
export function contactUrl(contact, message = '') {
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  if (contact.app === APPS.TELEGRAM) return `https://t.me/${contact.handle}${text}`;
  return `https://wa.me/${contact.handle}${text}`;
}

// قائمة مخزّنة ← قائمة صالحة فقط
export function sanitizeContacts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => (c && makeContact(c) ? { id: String(c.id ?? `${c.app}:${c.handle}`), ...makeContact(c) } : null))
    .filter(Boolean);
}
