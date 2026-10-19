// اختيار رقم شيخ من جهات اتصال الهاتف: نافذة أندرويد نفسها (MainActivity.pickContact)،
// فلا يطلب التطبيق إذن قراءة جهات الاتصال كلّها. خارج التطبيق (المتصفح) لا يظهر الزرّ.
export const canPickContact = () => typeof window !== 'undefined' && Boolean(window.AndroidApp?.pickContact);

// { name, phone } أو null إن ألغى المستخدم
export function pickContact() {
  return new Promise((resolve) => {
    window.onAndroidContactPicked = (picked) => {
      window.onAndroidContactPicked = null;
      resolve(picked && picked.phone ? picked : null);
    };
    window.AndroidApp.pickContact();
  });
}

// رقم من جهات الاتصال ← ما يُكتب في الخانة: الدولي يبقى دولياً (بلا + ولا 00)، والمحلّي يبقى كما هو
// ليكمل صاحبه مفتاح الدولة — لا يُخمَّن البلد.
export function phoneForField(phone) {
  const trimmed = String(phone ?? '').trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  return digits;
}

export const isInternational = (phone) => /^\s*(\+|00)/.test(String(phone ?? ''));
