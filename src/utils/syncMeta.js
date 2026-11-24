import { readAccount, validateEmail } from './syncAccount';

// طابع زمني محلي لآخر حالة معروفة (مرفوعة أو مسحوبة) لحسم آخر-تعديل-يفوز،
// ومعه اسم الحساب الذي زامن: هو «صاحب» بيانات هذا الجهاز.
const SYNC_META_KEY = 'quran-fives-sync-meta-v1';

function readRaw() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_META_KEY));
  } catch {
    return null;
  }
}

// الطابع يخصّ حساباً بعينه: لو دخل الجهاز بحساب آخر صار طابع الحساب السابق بلا
// معنى، فنعدّه صفراً (لم يزامن بعد) ليُعرض قرار المزامنة بدل رفعٍ بأساس خاطئ.
// طابع بلا اسم مكتوب قبل الحسابات، ويخصّ المالك وحده — وحسابه اسمٌ لا بريد.
// عدّه صالحاً لحساب بريدي كان يُرسل أساساً قديماً إلى سحابة فارغة فيردّ الخادم 409
// في كل رفعة، وزرّ إعادة المحاولة يكرّر الخطأ نفسه بلا نهاية.
function metaBelongsTo(meta, account) {
  if (!account) return false;
  if (meta.user) return meta.user === account.user;
  return validateEmail(account.user) !== null;
}

export function getSyncMeta() {
  const meta = readRaw();
  if (!meta || !metaBelongsTo(meta, readAccount())) return { updatedAt: 0 };
  return meta;
}

export function setSyncMeta(meta) {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify({ ...meta, user: readAccount()?.user }));
  } catch {
    // تجاهل فشل التخزين
  }
}

export function clearSyncMeta() {
  try {
    localStorage.removeItem(SYNC_META_KEY);
    localStorage.removeItem(SYNC_BASE_KEY);
    localStorage.removeItem(LOCAL_EDIT_KEY);
  } catch {
    // تجاهل فشل التخزين
  }
}

// ─── أساس الدمج: آخر حالة اتّفق عليها الجهاز والخادم (syncMerge.js) ───
// يخصّ الحساب نفسه صاحب الطابع، فلا يُدمج أساسُ حسابٍ في حساب آخر.
const SYNC_BASE_KEY = 'quran-fives-sync-base-v1';
// آخر تعديل محلي بعد الأساس (ساعة الجهاز): يحسم «الأحدث يفوز» حين يغيّر الجهازان القيمة نفسها
const LOCAL_EDIT_KEY = 'quran-fives-local-edit-v1';

export function getSyncBase() {
  const meta = readRaw();
  if (!meta || !metaBelongsTo(meta, readAccount())) return null;
  try {
    return JSON.parse(localStorage.getItem(SYNC_BASE_KEY));
  } catch {
    return null;
  }
}

export function setSyncBase(state) {
  try {
    localStorage.setItem(SYNC_BASE_KEY, JSON.stringify(state));
    localStorage.removeItem(LOCAL_EDIT_KEY);
  } catch {
    // تجاهل فشل التخزين: بلا أساس يُدمج بلا معرفة المحذوف، ولا يضيع شيء
  }
}

export function noteLocalEdit(at = Date.now()) {
  try { localStorage.setItem(LOCAL_EDIT_KEY, String(at)); } catch { /* تجاهل */ }
}

export function lastLocalEdit() {
  try { return Number(localStorage.getItem(LOCAL_EDIT_KEY)) || 0; } catch { return 0; }
}

// هل بيانات هذا الجهاز زامنها حساب غير الداخل الآن؟ (تبديل المستخدم على الجهاز نفسه)
// جهاز لم يزامن قط بياناتُه لصاحبه الحالي، فليست غريبة.
export function deviceDataIsForeign() {
  const meta = readRaw();
  return Boolean(meta) && !metaBelongsTo(meta, readAccount());
}
