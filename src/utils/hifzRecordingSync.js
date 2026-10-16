import { loadStoredState, saveStoredState } from './persistence';
import { canReachServer, currentAccount, fetchRemoteIndex, uploadFile, deleteRemoteFile, downloadFile } from './fileRemote';
import { recordingPath, recordingExists, readRecordingBlob, writeRecordingBlob } from './hifzRecordingStore';

// ─── مزامنة «تسجيلاتي» مع حساب صاحبها ───
// الملف يُرفع في الخلفية، والجهاز الجديد يأخذ القائمة من السيرفر وينزّل كل تسجيل عند أول تشغيل.
// تسجيلات حساب آخر على الجهاز نفسه لا تُعرض ولا تُرفع إلى هذا الحساب أبداً.
const KIND = 'hifz';
// حذفٌ لم يصل السيرفر (بلا شبكة): { [account]: [id] } — يُعاد عند المزامنة التالية
const PENDING_DELETES_KEY = 'quran-fives-hifz-deletes-v1';

const metaOf = (r) => ({ verseIndex: r.verseIndex, s: r.s, a: r.a, refs: r.refs, durationMs: r.durationMs, createdAt: r.createdAt });

// التسجيل يخصّ الحساب الحالي أو لم يُنسب لحساب بعد
export const belongsHere = (r, account = currentAccount()) => !r.account || r.account === account;

const loadDeletes = () => {
  const saved = loadStoredState(PENDING_DELETES_KEY);
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
};
const saveDeletes = (map) => saveStoredState(PENDING_DELETES_KEY, map);

export async function uploadRecording(r) {
  await uploadFile(KIND, r.id, await readRecordingBlob(r), { mime: r.mime, meta: metaOf(r) });
  return { ...r, uploaded: true };
}

// يحذف من السيرفر، أو يؤجّل الحذف إن تعذّر
export async function forgetRemote(r) {
  const account = r.account || currentAccount();
  if (!account || !r.uploaded) return;
  try {
    if (!canReachServer() || account !== currentAccount()) throw new Error('later');
    await deleteRemoteFile(KIND, r.id);
  } catch {
    const map = loadDeletes();
    saveDeletes({ ...map, [account]: [...new Set([...(map[account] || []), r.id])] });
  }
}

// تسجيل من السيرفر لا ملف له هنا: يُنزَّل قبل تشغيله
export async function ensureLocal(r) {
  if (await recordingExists(r)) return;
  const blob = await downloadFile(KIND, r.id, r.file);
  if (blob) await writeRecordingBlob(r, blob);
}

/**
 * مزامنة كاملة للقائمة: حذف مؤجَّل، نسبة التسجيلات غير المنسوبة إلى الحساب الحالي، رفع ما لم
 * يُرفع، ثم إضافة ما على السيرفر وليس هنا. تعيد القائمة الجديدة (أو القديمة إن تعذّر الاتصال).
 */
export async function syncRecordings(list) {
  const account = currentAccount();
  if (!canReachServer() || !account) return list;

  const deletes = loadDeletes();
  const pending = deletes[account] || [];
  const stillPending = [];
  for (const id of pending) {
    try { await deleteRemoteFile(KIND, id); } catch { stillPending.push(id); }
  }
  if (pending.length) saveDeletes({ ...deletes, [account]: stillPending });

  let next = list.map((r) => (r.account ? r : { ...r, account }));
  for (let i = 0; i < next.length; i++) {
    const r = next[i];
    if (r.account !== account || r.uploaded === true || !await recordingExists(r)) continue;
    try { next[i] = await uploadRecording(r); } catch { /* يُعاد في المرة التالية */ }
  }

  const remote = await fetchRemoteIndex(KIND);
  const known = new Set(next.map((r) => r.id));
  const added = Object.entries(remote)
    .filter(([id]) => !known.has(id) && !stillPending.includes(id))
    .map(([id, entry]) => ({
      ...(entry.meta || {}),
      id,
      mime: entry.mime,
      file: recordingPath(id, entry.mime),
      createdAt: entry.meta?.createdAt ?? entry.addedAt,
      account,
      uploaded: true,
    }));
  next = [...next, ...added].sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0));
  return next;
}
