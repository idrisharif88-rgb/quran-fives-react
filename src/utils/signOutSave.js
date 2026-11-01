import { SYNC_ENABLED } from './syncConfig';
import { pushLocal, fetchRemoteInfo } from './cloudSync';
import { deviceDataIsForeign } from './syncMeta';
import { isPristineState } from './deviceData';
import { GOOGLE_ENABLED } from './googleDrive';
import { backupNow } from './googleBackup';
import { FAILURE, classifyFailure } from './signOutFlow';

const OK = { ok: true };
const failed = (failure) => ({ ok: false, failure });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const usesServer = (status) => SYNC_ENABLED && status?.approved !== false;
const usesDrive = (status) => GOOGLE_ENABLED && Boolean(status?.googleBackup);

// أين تُحفظ البيانات قبل الخروج — للعرض
export function destinationName(status) {
  if (usesServer(status)) return 'حسابك';
  return usesDrive(status) ? 'جوجل درايف' : '';
}

async function conflictFailure() {
  const cloudAt = await fetchRemoteInfo().then((i) => i.updatedAt).catch(() => 0);
  return { kind: FAILURE.CONFLICT, cloudAt };
}

async function saveToServer({ snapshot, isServerReady, isPushBusy }) {
  // فحص الفتح لم يكتمل: لا يُرفع بأساس لم يُتحقَّق منه
  if (!isServerReady()) {
    const info = await fetchRemoteInfo();
    if (info.hasState && !info.inSync) {
      const conflict = new Error('cloud differs');
      conflict.status = 409;
      throw conflict;
    }
    // لا تُرفع بيانات حساب آخر إلى هذا الحساب بلا سؤال
    if (!info.hasState && deviceDataIsForeign()) {
      const foreign = new Error('foreign device data');
      foreign.status = 403;
      throw foreign;
    }
  }
  // رفعة واحدة في كل لحظة: ننتظر الجارية كي لا تتصادما بـ409
  for (let i = 0; i < 40 && isPushBusy(); i++) await wait(150);
  await pushLocal(snapshot);
}

/**
 * يحفظ بيانات الحساب قبل مسحها: الخادم أوّلاً، ثم نسخة جوجل درايف إن تعذّر الخادم.
 * يعيد { ok: true } فقط إن تأكّد الحفظ، وإلا { ok: false, failure } ولا يُمسح شيء.
 */
export async function saveBeforeSignOut({ snapshot, status, isServerReady, isPushBusy }) {
  if (!snapshot || isPristineState(snapshot)) return OK;   // لا شيء يضيع
  if (navigator.onLine === false) return failed({ kind: FAILURE.OFFLINE });

  let serverFailure = null;
  if (usesServer(status)) {
    try {
      await saveToServer({ snapshot, isServerReady, isPushBusy });
      return OK;
    } catch (e) {
      serverFailure = classifyFailure(e);
      // قراران لا تحلّهما نسخة درايف: تعارض يخيَّر فيه المستخدم، وجلسة منتهية
      if (serverFailure.kind === FAILURE.CONFLICT) return failed(await conflictFailure());
      if (serverFailure.kind === FAILURE.EXPIRED) return failed(serverFailure);
    }
  }

  if (usesDrive(status)) {
    try {
      if (await backupNow({ interactive: false })) return OK;
    } catch (e) {
      // رمز خطأ جوجل ليس رمز حساب التطبيق: 401 هنا لا تعني انتهاء جلسته
      return failed(classifyFailure({ message: e?.message }));
    }
  }
  return failed(serverFailure || { kind: FAILURE.NO_DESTINATION });
}

// «اربط جوجل درايف واحفظ»: تفتح نافذة جوجل بطلب صريح من المستخدم
export async function linkDriveAndSave() {
  try {
    return await backupNow({ interactive: true }) ? OK : failed({ kind: FAILURE.NO_DESTINATION });
  } catch (e) {
    return failed(classifyFailure({ message: e?.message }));
  }
}
