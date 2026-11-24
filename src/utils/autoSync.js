import { fetchRemoteState, putState } from './cloudSync';
import { getSyncMeta, setSyncMeta, getSyncBase, setSyncBase, lastLocalEdit, deviceDataIsForeign } from './syncMeta';
import { APP_STORAGE_KEY, restoreSyncedLocal } from './persistence';
import { isPristineState } from './deviceData';
import { mergeStates, deepEqual } from './syncMerge';

// ─── المزامنة التلقائية: بلا سؤال، كما في التطبيقات الكبيرة ───
// تُستدعى عند الفتح، وعند العودة إلى التطبيق، وبالسحب للتحديث، وبعد تعارض 409.
// النتيجة: 'none' (لا شيء تغيّر)، 'pushed' (رُفعت نسخة الجهاز)، 'reload' (كُتبت نسخة جديدة
// على الجهاز ويجب إعادة التحميل فوراً بلا await بينهما، وإلا حفظ App ما في ذاكرته فوقها)،
// أو 'emptyCloud' (بيانات حساب آخر على الجهاز وسحابة فارغة: القرار للمستخدم).

// يكتب الحالة على الجهاز كما يفعل التنزيل، ثم يعيد المتّصل التحميل
function writeLocal(state, updatedAt) {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  restoreSyncedLocal(state.localStores);
  setSyncMeta({ updatedAt });
  setSyncBase(state);
}

/** جهاز بلا محتوى لم يزامن قط: لا يرفع شيئاً أبداً، ولا يُعرض عليه إلا تنزيل نسخة السحابة */
export const isEmptyDevice = (snapshot) => isPristineState(snapshot) && !getSyncBase();

/** هل في الجهاز تعديل لم يصل إلى الخادم؟ */
export function hasLocalChanges(snapshot) {
  const base = getSyncBase();
  return !base || !deepEqual(base, snapshot);
}

/**
 * @param snapshot حالة الجهاز الآن (lastSnapshotRef)
 * @param attempt  إعادة واحدة إن سبقنا جهاز آخر بين القراءة والكتابة (409)
 */
export async function reconcile(snapshot, attempt = 0) {
  const remote = await fetchRemoteState();
  const remoteState = remote?.state ?? null;
  const remoteAt = remote?.updatedAt ?? 0;
  const local = snapshot ?? null;
  const pristine = isEmptyDevice(local);

  try {
    // سحابة فارغة: جهاز بلا محتوى لا يرفع شيئاً أبداً، وبيانات حساب آخر لا تُرفع بلا سؤال
    if (!remoteState) {
      if (pristine) return 'none';
      if (deviceDataIsForeign()) return 'emptyCloud';
      await putState(local, remoteAt);
      return 'pushed';
    }

    // جهاز فارغ أو عليه بيانات حساب آخر: نسخة السحابة كما هي، لا دمج
    if (pristine || deviceDataIsForeign()) {
      if (local && deepEqual(local, remoteState)) { setSyncMeta({ updatedAt: remoteAt }); setSyncBase(remoteState); return 'none'; }
      writeLocal(remoteState, remoteAt);
      return 'reload';
    }

    const remoteNews = remoteAt !== getSyncMeta().updatedAt;
    const localNews = hasLocalChanges(local);

    if (!remoteNews) {
      if (!localNews) return 'none';
      await putState(local, remoteAt);
      return 'pushed';
    }
    if (!localNews) {
      writeLocal(remoteState, remoteAt);
      return 'reload';
    }

    // تغيّر الطرفان: دمج، ثم رفع النتيجة. الأحدث يفوز في القيمة الواحدة التي غيّراها معاً.
    const newer = lastLocalEdit() > remoteAt ? 'local' : 'remote';
    const merged = mergeStates(getSyncBase(), local, remoteState, newer);
    await putState(merged, remoteAt);
    if (deepEqual(merged, local)) return 'pushed';
    writeLocal(merged, getSyncMeta().updatedAt);
    return 'reload';
  } catch (e) {
    if (e?.status === 409 && attempt < 1) return reconcile(snapshot, attempt + 1);
    throw e;
  }
}
