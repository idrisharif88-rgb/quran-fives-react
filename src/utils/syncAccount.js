// حساب المستخدم على هذا الجهاز: بريد + كلمة سر، يفتحان المزامنة وسجلّ الختمات معاً.
// name اسم العرض الذي يُرحَّب به المستخدم (اختياري — الحسابات الأقدم بلا اسم).
// device مفتاح الجهاز الموثوق: يمنحه الخادم بعد تأكيد رمز البريد (التحقّق بخطوتين)
// ويُرسل مع كل طلب. الحسابات الأقدم (اسم بلا بريد) لا مفتاح لها.
// المفتاح يحمل اسم «khitma» القديم عمداً: من كان داخلاً إلى سجلّ الختمات قبل
// التحديث يبقى داخلاً بعده بلا إعادة إدخال.
const ACCOUNT_KEY = 'quran-fives-khitma-creds-v1';

export function readAccount() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCOUNT_KEY));
    if (!saved?.user || !saved?.code) return null;
    return {
      user: saved.user,
      code: saved.code,
      ...(saved.device ? { device: saved.device } : {}),
      ...(saved.name ? { name: saved.name } : {}),
    };
  } catch {
    return null;
  }
}

export function saveAccount(creds) {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(creds));
  } catch {
    // تجاهل فشل التخزين
  }
}

export function clearAccount() {
  try {
    localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    // تجاهل فشل التخزين
  }
}

// آخر حالة عرفها الخادم لهذا الحساب: { approved, admin }. تُحفظ محلياً لأن التطبيق
// يعمل بلا شبكة — المالك يرى ما يخصّه («فقهيات») حتى وهو غير متّصل.
const STATUS_KEY = 'quran-fives-account-status-v1';

export function readAccountStatus() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATUS_KEY));
    return saved && saved.user === readAccount()?.user ? { approved: Boolean(saved.approved), admin: Boolean(saved.admin) } : null;
  } catch {
    return null;
  }
}

export function saveAccountStatus(status) {
  try {
    if (!status) localStorage.removeItem(STATUS_KEY);
    else localStorage.setItem(STATUS_KEY, JSON.stringify({ user: readAccount()?.user, approved: status.approved, admin: status.admin }));
  } catch {
    // تجاهل فشل التخزين
  }
}

// Authorization: Basic بترميز UTF-8 — ترويسات fetch لا تقبل الحروف العربية خاماً
export function authHeaders(creds) {
  if (!creds) return {};
  const bytes = new TextEncoder().encode(`${creds.user}:${creds.code}`);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return {
    Authorization: 'Basic ' + btoa(binary),
    ...(creds.device ? { 'X-Device': creds.device } : {}),
  };
}

// شروط الحساب الجديد — تطابق ما يفرضه الخادم (server/accounts.js).
// الحساب الجديد بريد إلكتروني؛ الدخول لا يُفحص، فالحسابات الأقدم (اسم لا بريد) تبقى صالحة.
export const MIN_CODE_LENGTH = 6;
const EMAIL_RE = /^[^\s@:]+@[^\s@:]+\.[^\s@:]+$/;

export function validateEmail(user) {
  return user.length <= 254 && EMAIL_RE.test(user) ? null : 'اكتب بريداً إلكترونياً صحيحاً';
}

export function validateName(name) {
  return name.length >= 2 && name.length <= 40 && !/[<>]/.test(name) ? null : 'اكتب اسمك (حرفان على الأقل)';
}

export function validateCode(code) {
  return code.length >= MIN_CODE_LENGTH ? null : `كلمة السر ${MIN_CODE_LENGTH} أحرف على الأقل`;
}
