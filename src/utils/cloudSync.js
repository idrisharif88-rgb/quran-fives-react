import { SYNC_URL, SYNC_CODE, SYNC_ENABLED } from './syncConfig';
import { APP_STORAGE_KEY } from './persistence';

// طابع زمني محلي لآخر حالة معروفة (مرفوعة أو مسحوبة) لحسم آخر-تعديل-يفوز
const SYNC_META_KEY = 'quran-fives-sync-meta-v1';

export function getSyncMeta() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_META_KEY)) || { updatedAt: 0 };
  } catch {
    return { updatedAt: 0 };
  }
}

function setSyncMeta(meta) {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  } catch {
    // تجاهل فشل التخزين
  }
}

async function api(path, options = {}, timeoutMs = 12000) {
  // مهلة زمنية حتى لا يعلّق الطلب إلى ما لا نهاية على شبكة بطيئة
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(SYNC_URL + path, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Code': SYNC_CODE,
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

// يسحب الحالة من الخادم؛ إن اختلف طابعها عن آخر نسخة رآها هذا الجهاز يكتبها
// في localStorage ويعيد true ليطلب المستدعي إعادة التحميل لتطبيقها.
// المقارنة بعدم التساوي لا بالأكبر: الطابع يصدر عن ساعة الخادم وحدها، وأي
// اختلاف يعني أن جهازاً آخر كتب بعدنا (ويُصلح أيضاً الطوابع القديمة المشوّهة).
export async function pullRemoteIfChanged() {
  if (!SYNC_ENABLED) return false;
  const remote = await api('/api/state', { method: 'GET' });
  const localMeta = getSyncMeta();
  if (remote && remote.state && remote.updatedAt !== localMeta.updatedAt) {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(remote.state));
    setSyncMeta({ updatedAt: remote.updatedAt });
    return true;
  }
  return false;
}

// يرفع الحالة المحلية مستنداً إلى آخر نسخة رآها هذا الجهاز.
// الخادم هو من يمنح الطابع الزمني، ويرفض الرفع بـ409 إن تغيّرت الحالة منذئذٍ.
export async function pushLocal(state) {
  if (!SYNC_ENABLED) return;
  const body = JSON.stringify({ state, baseUpdatedAt: getSyncMeta().updatedAt });
  // ٣ محاولات مع تراجع تصاعدي — تتجاوز الأعطال الشبكية العابرة دون إعلان فشل
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await api('/api/state', { method: 'PUT', body });
      setSyncMeta({ updatedAt: result.updatedAt });
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

// ─── سجلّ الختمات الخاص: محمي ببيانات المالك (user + code) ───
function khitmaHeaders(creds) {
  return { 'X-Khitma-User': creds.user, 'X-Khitma-Code': creds.code };
}

// يتحقّق من بيانات الدخول؛ يرمي خطأ (401) إن كانت غير صحيحة
export async function authKhitma(creds) {
  await api('/api/khitma/auth', { method: 'POST', headers: khitmaHeaders(creds) });
  return true;
}

// يسحب قائمة الختمات من الخادم (يتطلّب بيانات دخول صحيحة).
// يعيد الطابع الزمني أيضاً ليحتفظ به الجهاز أساساً (base) للرفع التالي.
export async function getKhitma(creds) {
  const r = await api('/api/khitma', { method: 'GET', headers: khitmaHeaders(creds) });
  return { list: Array.isArray(r?.list) ? r.list : [], updatedAt: r?.updatedAt ?? 0 };
}

// يرفع قائمة الختمات مستنداً إلى النسخة التي سحبها الجهاز.
// الخادم يمنح الطابع الزمني، ويرد 409 إن تغيّر السجلّ منذ السحب.
export async function putKhitma(creds, list, baseUpdatedAt) {
  return api('/api/khitma', {
    method: 'PUT',
    headers: khitmaHeaders(creds),
    body: JSON.stringify({ list, baseUpdatedAt }),
  });
}
