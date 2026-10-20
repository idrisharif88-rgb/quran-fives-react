import { loadStoredState, saveStoredState } from './persistence';
import { listFiles, uploadBlob, readBlob, deleteFile, linkedEmail } from './googleDrive';
import { currentAccount } from './fileRemote';
import { loadRecordingIndex, saveRecordingIndex, recordingExists, readRecordingBlob, writeRecordingBlob } from './hifzRecordingStore';
import { belongsHere, ensureLocal } from './hifzRecordingSync';
import { loadIjazaFiles, saveIjazaFiles, hasLocal, readLocalBlob, writeLocal, ensureIjazaLocal } from './ijazaFileStore';

// ─── ملفّات النسخة في جوجل درايف: تسجيلات الحفظ والمراجعة، وملفّات الإجازات ───
// كل ملف يُرفع مرة واحدة باسم ثابت (المعرّف في الاسم)، فالنسخ التالي يرفع الجديد وحده.
// الإجازة يدخل تاريخ إرفاقها في اسمها: إعادة الإرفاق ملف جديد، والقديم يُحذف.
// الحذف من درايف لا يمسّ إلا ملفّاً رفعه هذا الجهاز أو استرجعه (TRACK_KEY): جهاز جديد لم يسترجع
// بعد لا يرى ملفّات درايف «زائدة» فيمحوها.
const TRACK_KEY = 'quran-fives-google-files-v1';

const recordingName = (r) => `hifz-${r.file.split('/').pop()}`;
const ijazaName = (id, entry) => `ijaza-${id}-${entry.addedAt || 0}.pdf`;

// المتتبَّع لكل حساب تطبيق مع حساب جوجل المربوط
const scope = () => `${currentAccount() || ''}|${linkedEmail() || ''}`;
const loadTracked = () => new Set(loadStoredState(TRACK_KEY)?.[scope()] || []);
const saveTracked = (names) => saveStoredState(TRACK_KEY, { ...(loadStoredState(TRACK_KEY) || {}), [scope()]: [...names] });

const ownRecordings = () => loadRecordingIndex().filter((r) => belongsHere(r));

// فهرسا الملفّات كما يُحفظان في ملف النسخة
export const filesIndex = () => ({ hifz: ownRecordings(), ijaza: loadIjazaFiles() });

function localFiles() {
  const recordings = ownRecordings().map((r) => ({
    name: recordingName(r),
    read: async () => { if (!await recordingExists(r)) await ensureLocal(r); return readRecordingBlob(r); },
  }));
  const ijazat = Object.entries(loadIjazaFiles()).map(([id, entry]) => ({
    name: ijazaName(id, entry),
    read: async () => { await ensureIjazaLocal(id); return readLocalBlob(id); },
  }));
  return [...recordings, ...ijazat];
}

/**
 * يرفع ما ليس في درايف ويحذف منه ما حُذف هنا. onProgress(done, total) للرفع.
 * ملف تعذّر رفعه لا يُفشل النسخة: يُعاد في المرة التالية. يعيد عدد ما تعذّر.
 */
export async function backupFiles(token, onProgress) {
  const remote = new Map((await listFiles(token)).map((f) => [f.name, f]));
  const items = localFiles();
  const wanted = new Set(items.map((i) => i.name));
  const tracked = loadTracked();
  const todo = items.filter((i) => !remote.has(i.name));
  let failed = 0;
  onProgress?.(0, todo.length);
  for (let i = 0; i < todo.length; i++) {
    try {
      await uploadBlob(token, todo[i].name, await todo[i].read());
      tracked.add(todo[i].name);
    } catch (e) {
      if (e?.status === 401) throw e;
      failed++;
    }
    onProgress?.(i + 1, todo.length);
  }
  items.forEach((i) => { if (remote.has(i.name)) tracked.add(i.name); });
  for (const name of [...tracked]) {
    if (wanted.has(name)) continue;
    try {
      if (remote.has(name)) await deleteFile(token, remote.get(name).id);
      tracked.delete(name);
    } catch { /* يُعاد في النسخ التالي */ }
  }
  saveTracked(tracked);
  return failed;
}

/**
 * الاسترجاع: يضيف إلى فهرسَي الجهاز ما في النسخة وليس هنا، وينزّل كل ملف لا نسخة له على الجهاز.
 * ما لم يُنزَّل يبقى في الفهرس، فيُنزَّل من السيرفر عند فتحه إن كان هناك.
 */
export async function restoreFiles(token, index, onProgress) {
  if (!index || typeof index !== 'object') return;
  const remote = new Map((await listFiles(token)).map((f) => [f.name, f]));
  const tracked = loadTracked();

  const local = loadRecordingIndex();
  const known = new Set(local.map((r) => r.id));
  const recordings = (Array.isArray(index.hifz) ? index.hifz : []).filter((r) => r?.id && r.file);
  const added = recordings.filter((r) => !known.has(r.id));
  if (added.length) saveRecordingIndex([...local, ...added].sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0)));

  const ijazat = { ...(index.ijaza || {}), ...loadIjazaFiles() };
  saveIjazaFiles(ijazat);

  const tasks = [
    ...recordings.map((r) => ({ name: recordingName(r), missing: async () => !await recordingExists(r), write: (b) => writeRecordingBlob(r, b) })),
    ...Object.entries(ijazat).map(([id, entry]) => ({ name: ijazaName(id, entry), missing: async () => !await hasLocal(id), write: (b) => writeLocal(id, b) })),
  ].filter((t) => remote.has(t.name));

  onProgress?.(0, tasks.length);
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    tracked.add(task.name);
    try {
      if (await task.missing()) await task.write(await readBlob(token, remote.get(task.name).id));
    } catch (e) {
      if (e?.status === 401) throw e;
    }
    onProgress?.(i + 1, tasks.length);
  }
  saveTracked(tracked);
}
