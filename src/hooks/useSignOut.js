import { useCallback, useEffect, useReducer, useRef } from 'react';
import { IDLE, classifyFailure, lossSummary, signOutReducer } from '../utils/signOutFlow';
import { saveBeforeSignOut, linkDriveAndSave } from '../utils/signOutSave';
import { forcePushLocal } from '../utils/cloudSync';
import { wipeDeviceData } from '../utils/deviceData';
import { forgetGoogleLink } from '../utils/googleBackup';

// «تبديل الحساب» يعيد التحميل بعد مسح الجهاز، ثم تُفتح اللوحة على نموذج الدخول
export const REOPEN_SYNC_PANEL_KEY = 'quran-fives-reopen-sync-panel';

/**
 * تسجيل الخروج وتبديل الحساب: يحفظ، ثم يمسح الجهاز، ثم يعيد التحميل.
 * الإلغاء حقيقي: runRef يُبطل الحفظ الجاري، فلا يصل نتيجته إلى المسح.
 */
export default function useSignOut({ account, signOut, status, snapshotRef, serverReadyRef, pushBusyRef, backRef }) {
  const [flow, dispatch] = useReducer(signOutReducer, IDLE);
  const runRef = useRef(0);

  const leave = useCallback(async ({ wipe, switching }) => {
    await forgetGoogleLink();
    // من هنا إلى إعادة التحميل بلا انتظار: أيّ حفظ من App بعد المسح يعيد البيانات إلى الجهاز
    if (wipe) wipeDeviceData();
    signOut();
    try { if (switching) sessionStorage.setItem(REOPEN_SYNC_PANEL_KEY, '1'); } catch { /* تجاهل */ }
    window.location.reload();
  }, [signOut]);

  const run = useCallback(async (save, switching) => {
    const id = ++runRef.current;
    dispatch({ type: 'start' });
    let result;
    try {
      result = await save();
    } catch (e) {
      result = { ok: false, failure: classifyFailure(e) };
    }
    if (id !== runRef.current) return;   // أُلغي أثناء الحفظ
    if (!result.ok) { dispatch({ type: 'fail', failure: result.failure }); return; }
    dispatch({ type: 'saved' });
    await leave({ wipe: true, switching });
  }, [leave]);

  const save = useCallback((switching) => run(() => saveBeforeSignOut({
    snapshot: snapshotRef.current,
    status,
    isServerReady: () => serverReadyRef.current,
    isPushBusy: () => pushBusyRef.current,
  }), switching), [run, status, snapshotRef, serverReadyRef, pushBusyRef]);

  const back = useCallback(() => {
    runRef.current++;
    dispatch({ type: 'back' });
  }, []);

  // زر الرجوع في الهاتف: يغلق ما دام مفتوحاً، ولا يفعل شيئاً بعد بدء المسح
  const isOpen = flow.step !== 'idle';
  useEffect(() => {
    if (!isOpen) return undefined;
    backRef.current = back;
    return () => { backRef.current = null; };
  }, [isOpen, back, backRef]);

  // خروج من طريق آخر (401، حذف الحساب): ربط جوجل لا يبقى للمستخدم التالي
  const hadAccountRef = useRef(Boolean(account));
  useEffect(() => {
    if (hadAccountRef.current && !account) forgetGoogleLink();
    hadAccountRef.current = Boolean(account);
  }, [account]);

  const { switching } = flow;
  return {
    flow,
    open: useCallback((asSwitch) => dispatch({ type: 'open', switching: asSwitch }), []),
    back,
    start: () => save(switching),
    linkDrive: () => run(linkDriveAndSave, switching),
    askDelete: () => dispatch({ type: 'askDelete', losses: lossSummary(snapshotRef.current) }),
    // تعارض: نسخة هذا الهاتف تكتب فوق السحابة، ثم يُمسح الجهاز
    keepDeviceCopy: () => run(async () => { await forcePushLocal(snapshotRef.current); return { ok: true }; }, switching),
    // قرار صريح بعد فشل الحفظ. الجلسة المنتهية لا تُمسح بياناتها: تعود لصاحبها عند الدخول
    leaveWithoutSaving: ({ wipe }) => {
      runRef.current++;
      dispatch({ type: 'wipe' });
      return leave({ wipe, switching });
    },
  };
}
