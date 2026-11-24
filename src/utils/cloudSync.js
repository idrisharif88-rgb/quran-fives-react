import { SYNC_URL, SYNC_ENABLED } from './syncConfig';
import { readAccount, authHeaders } from './syncAccount';
import { getSyncMeta, setSyncMeta, setSyncBase } from './syncMeta';

// creds: حساب الطلب. الافتراضي هو الحساب المحفوظ على الجهاز؛ null يرسل بلا دخول.
async function api(path, { creds = readAccount(), ...options } = {}, timeoutMs = 12000) {
  // مهلة زمنية حتى لا يعلّق الطلب إلى ما لا نهاية على شبكة بطيئة
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(SYNC_URL + path, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(creds),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const err = new Error('sync http ' + res.status);
      err.status = res.status; // يميّز التعارض (409) عن أعطال الشبكة العابرة
      throw err;
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// حُذفت pullRemoteIfChanged عمداً: كانت تكتب نسخة الخادم فوق الحالة المحلية
// تلقائياً بمجرّد اختلاف الطابع الزمني، فتتبدّل حالة الجهاز بلا سؤال. صار الفحص
// بـfetchRemoteInfo (قراءة فقط)، والتطبيق اليوم بالدمج التلقائي (autoSync.js).
// المقارنة بعدم التساوي لا بالأكبر: الطابع يصدر عن ساعة الخادم وحدها، وأي
// اختلاف يعني أن جهازاً آخر كتب بعدنا (ويُصلح أيضاً الطوابع القديمة المشوّهة).

// معرّف كتابة فريد يتكرّر عبر محاولات الرفع نفسها: لو وصلت الكتابة وضاع ردّها،
// يتعرّف الخادم على إعادة الإرسال ويردّ نجاحاً بدل 409 يعطّل المزامنة.
function newWriteId() {
  try { return crypto.randomUUID(); } catch { return String(Date.now()) + '-' + Math.random(); }
}

// يرفع الحالة المحلية مستنداً إلى آخر نسخة رآها هذا الجهاز.
// الخادم هو من يمنح الطابع الزمني، ويرفض الرفع بـ409 إن تغيّرت الحالة منذئذٍ.
export async function pushLocal(state) {
  if (!SYNC_ENABLED) return;
  const body = JSON.stringify({ state, baseUpdatedAt: getSyncMeta().updatedAt, writeId: newWriteId() });
  // ٣ محاولات مع تراجع تصاعدي — تتجاوز الأعطال الشبكية العابرة دون إعلان فشل
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await api('/api/state', { method: 'PUT', body });
      setSyncMeta({ updatedAt: result.updatedAt });
      setSyncBase(state);
      return;
    } catch (e) {
      lastErr = e;
      // التعارض وأخطاء الطلب لا تُصلحها إعادة المحاولة — الفشل يُعلن فوراً
      if (e.status && e.status < 500) break;
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// ─── حالة الخادم للوحة المزامنة، ورفع قسري لحالتين: نسخ بيانات الجهاز إلى سحابة فارغة
// (emptyCloud) وحفظ نسخة الجهاز قبل تسجيل الخروج (useSignOut). يقرأ طابع الخادم الحالي
// ويجعله أساس الكتابة، فينجح بلا 409 ودون تغيير في عقد الخادم.

// معلومات الخادم للعرض: متى آخر تحديث، وهل يطابق ما يعرفه هذا الجهاز
export async function fetchRemoteInfo() {
  if (!SYNC_ENABLED) return { updatedAt: 0, hasState: false, inSync: true };
  const remote = await api('/api/state', { method: 'GET' });
  const remoteUpdatedAt = remote?.updatedAt ?? 0;
  return {
    updatedAt: remoteUpdatedAt,
    hasState: Boolean(remote?.state),
    inSync: remoteUpdatedAt === getSyncMeta().updatedAt,
  };
}

// رفع: نسخة هذا الجهاز تحلّ محلّ نسخة السحابة
export async function forcePushLocal(state) {
  if (!SYNC_ENABLED) throw new Error('sync disabled');
  const remote = await api('/api/state', { method: 'GET' });
  const body = JSON.stringify({
    state,
    baseUpdatedAt: remote?.updatedAt ?? 0,   // أساس = ما على الخادم الآن، فلا تعارض
    writeId: newWriteId(),
  });
  const result = await api('/api/state', { method: 'PUT', body });
  setSyncMeta({ updatedAt: result.updatedAt });
  setSyncBase(state);
  return result.updatedAt;
}

// ─── المزامنة التلقائية (autoSync.js): قراءة نسخة الخادم، وكتابة بأساس صريح ───
export const fetchRemoteState = () => api('/api/state', { method: 'GET' });

export async function putState(state, baseUpdatedAt) {
  const body = JSON.stringify({ state, baseUpdatedAt, writeId: newWriteId() });
  const result = await api('/api/state', { method: 'PUT', body });
  setSyncMeta({ updatedAt: result.updatedAt });
  setSyncBase(state);
  return result.updatedAt;
}

// ─── الحساب: تسجيل بالبريد، دخول بخطوتين، واسترجاع كلمة السر ───
// كلّها ترمي خطأً يحمل status (400/401/403/409/429/503) لتعرض الواجهة السبب.
// كل خطوة تؤكّد رمز البريد تعيد { device }: مفتاح هذا الجهاز الموثوق.

const post = (path, body) => api(path, { method: 'POST', creds: null, body: JSON.stringify(body) });

// الخطوة 1: يطلب الحساب فيُرسل الخادم رمز تأكيد إلى البريد
export const registerAccount = (creds) => post('/api/auth/register', creds);

// الخطوة 2: الرمز المُرسل يُنشئ الحساب
export const verifyAccount = (user, otp) => post('/api/auth/verify', { user, otp });

// الدخول، الخطوة 1: كلمة السر. يعيد { pending: true } إن أُرسل رمز إلى البريد
// (جهاز جديد)، أو { ok: true } بلا رمز لحساب أقدم بلا بريد.
export const loginAccount = (creds) => api('/api/auth/login', { method: 'POST', creds });

// الدخول، الخطوة 2: رمز البريد
export const confirmLogin = (creds, otp) =>
  api('/api/auth/login/confirm', { method: 'POST', creds, body: JSON.stringify({ otp }) });

// جلسة الموقع: كلمة السر ومفتاح الجهاز ← مفتاح جلسة يُحفظ بدل الكلمة (webSession.js)
export const createSession = (creds) => api('/api/auth/session', { method: 'POST', creds });
export const revokeSession = () => api('/api/auth/session', { method: 'DELETE' }, 5000);

// استرجاع كلمة السر: رمز إلى البريد، ثم الرمز مع الكلمة الجديدة
export const requestReset = (user) => post('/api/auth/reset/request', { user });
export const confirmReset = (user, otp, code) => post('/api/auth/reset/confirm', { user, otp, code });

// ─── سجلّ الختمات: خاص بكل حساب ───

// يسحب قائمة الختمات من الخادم (يتطلّب بيانات دخول صحيحة).
// يعيد الطابع الزمني أيضاً ليحتفظ به الجهاز أساساً (base) للرفع التالي.
export async function getKhitma(creds) {
  const r = await api('/api/khitma', { method: 'GET', creds });
  return { list: Array.isArray(r?.list) ? r.list : [], updatedAt: r?.updatedAt ?? 0 };
}

// يرفع قائمة الختمات مستنداً إلى النسخة التي سحبها الجهاز.
// الخادم يمنح الطابع الزمني، ويرد 409 إن تغيّر السجلّ منذ السحب.
export async function putKhitma(creds, list, baseUpdatedAt) {
  return api('/api/khitma', {
    method: 'PUT',
    creds,
    body: JSON.stringify({ list, baseUpdatedAt, writeId: newWriteId() }),
  });
}

// ─── حالة الحساب ولوحة المشرف ───

// { name, approved, admin } — الحساب الجديد لا يزامن قبل موافقة المشرف (approved)
export const fetchMe = () => api('/api/auth/me', { method: 'GET' });

// للمشرف وحده: كل الحسابات، والموافقة على حساب أو إيقافه
export const listUsers = async () => (await api('/api/admin/users', { method: 'GET' })).users;
export const setUserApproval = (user, approved) =>
  api('/api/admin/users/approval', { method: 'POST', body: JSON.stringify({ user, approved }) });
// صلاحية لحساب بعينه — hifzCustomStart: بدء الحفظ من آية يختارها
export const setUserPermission = (user, permission, allowed) =>
  api('/api/admin/users/permission', { method: 'POST', body: JSON.stringify({ user, permission, allowed }) });

// حذف الحساب وكل بياناته وملفاته من الخادم. creds بكلمة السر كما أعاد المستخدم كتابتها،
// ومعها مفتاح الجهاز. يعمل ولو لم يوافق المشرف على الحساب بعد.
// سجلّ الأخطاء للمالك (server/errorLogRoutes.js)
export const fetchErrorLog = (days) => api(`/api/admin/errors?days=${days}`, { method: 'GET' });
export const setErrorLogEnabled = (enabled) =>
  api('/api/admin/errors/config', { method: 'POST', body: JSON.stringify({ enabled }) });
export const clearErrorLog = () => api('/api/admin/errors', { method: 'DELETE' });
export const nameErrorDevice = (installId, name) =>
  api('/api/admin/errors/device', { method: 'POST', body: JSON.stringify({ installId, name }) });

// سجلّ الأمان للمالك (server/securityLog.js)
export const fetchSecurityLog = (days) => api(`/api/admin/security?days=${days}`, { method: 'GET' });

export const deleteAccount = (creds) => api('/api/account/delete', { method: 'POST', creds });
