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

// رابط intent لمتصفّح أندرويد: يفتح التطبيق مباشرة والصفحة باقية مكانها. window.open لرابط
// wa.me كان يفتح لسانَ تبويب جديداً يسلّمه للتطبيق ويبقى أبيض فارغاً عند العودة.
// إن لم يكن التطبيق مثبّتاً يفتح المتصفّح رابط https المعتاد (browser_fallback_url).
export function contactIntentUrl(contact, message = '') {
  const fallback = `S.browser_fallback_url=${encodeURIComponent(contactUrl(contact, message))}`;
  const text = message ? `&text=${encodeURIComponent(message)}` : '';
  if (contact.app === APPS.TELEGRAM) {
    const who = contact.handle.startsWith('+') ? `phone=${contact.handle.slice(1)}` : `domain=${contact.handle}`;
    return `intent://resolve?${who}${text}#Intent;scheme=tg;${fallback};end`;
  }
  return `intent://send?phone=${contact.handle}${text}#Intent;scheme=whatsapp;${fallback};end`;
}

// قائمة مخزّنة ← قائمة صالحة فقط
export function sanitizeContacts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => (c && makeContact(c) ? { id: String(c.id ?? `${c.app}:${c.handle}`), ...makeContact(c) } : null))
    .filter(Boolean);
}
