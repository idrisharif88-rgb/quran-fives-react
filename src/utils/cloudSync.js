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
    if (!res.ok) throw new Error('sync http ' + res.status);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// يسحب الحالة من الخادم؛ إن كانت أحدث من المحلية يكتبها في localStorage
// ويعيد true ليطلب المستدعي إعادة التحميل لتطبيقها على كامل الحالة.
export async function pullRemoteIfNewer() {
  if (!SYNC_ENABLED) return false;
  const remote = await api('/api/state', { method: 'GET' });
  const localMeta = getSyncMeta();
  if (remote && remote.state && remote.updatedAt > localMeta.updatedAt) {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(remote.state));
    setSyncMeta({ updatedAt: remote.updatedAt });
    return true;
  }
  return false;
}

// يرفع الحالة المحلية للخادم بطابع زمني جديد.
export async function pushLocal(state) {
  if (!SYNC_ENABLED) return;
  const updatedAt = Date.now();
  const body = JSON.stringify({ updatedAt, state });
  // ٣ محاولات مع تراجع تصاعدي — تتجاوز الأعطال الشبكية العابرة دون إعلان فشل
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await api('/api/state', { method: 'PUT', body });
      // إن كان الخادم يحوي نسخة أحدث (stale)، نعتمد طابعه لتفادي حلقة رفع
      setSyncMeta({ updatedAt: result?.updatedAt ?? updatedAt });
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}
