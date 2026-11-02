import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FOLDER as HIFZ_FOLDER, loadRecordingIndex, saveRecordingIndex } from './hifzRecordingStore';
import { FOLDER as IJAZA_FOLDER, loadIjazaFiles, saveIjazaFiles, syncIjazaFile } from './ijazaFileStore';
import { belongsHere, syncRecordings } from './hifzRecordingSync';

// ─── ملفات الحساب في المتصفح عند الخروج ───
// قد يكون المتصفح جهازاً مشتركاً، فلا تبقى فيه تسجيلات صاحب الحساب وإجازاته. في التطبيق تبقى كما هي.
// ما لم يصل السيرفر لا يُمحى (لا مسح قبل حفظ مؤكَّد)، ويبقى مخفياً عن غير صاحبه؛ فيُجرَّب رفعه أولاً.
// يعمل قبل wipeDeviceData: بين المسح وإعادة التحميل لا انتظار.
const UPLOAD_WAIT_MS = 20000;

const withinWait = (promise, fallback) => Promise.race([
  promise.catch(() => fallback),
  new Promise((resolve) => { setTimeout(() => resolve(fallback), UPLOAD_WAIT_MS); }),
]);

async function removeFolderExcept(folder, keepNames) {
  const directory = Directory.Data;
  const { files } = await Filesystem.readdir({ path: folder, directory }).catch(() => ({ files: [] }));
  for (const { name } of files) {
    if (!keepNames.has(name)) await Filesystem.deleteFile({ path: `${folder}/${name}`, directory }).catch(() => {});
  }
}

const baseName = (path) => path.split('/').pop();

async function clearRecordings(everything) {
  const list = loadRecordingIndex();
  const synced = everything ? list : await withinWait(syncRecordings(list), list);
  const kept = synced.filter((r) => r.uploaded !== true && !(everything && belongsHere(r)));
  saveRecordingIndex(kept);
  await removeFolderExcept(HIFZ_FOLDER, new Set(kept.map((r) => baseName(r.file))));
}

async function clearIjazaFiles(everything) {
  const index = loadIjazaFiles();
  if (!everything) {
    const unsent = Object.keys(index).filter((id) => index[id].uploaded !== true);
    await withinWait(Promise.all(unsent.map((id) => syncIjazaFile(id))), null);
  }
  const current = loadIjazaFiles();
  const kept = everything ? {} : Object.fromEntries(Object.entries(current).filter(([, entry]) => entry.uploaded !== true));
  saveIjazaFiles(kept);
  await removeFolderExcept(IJAZA_FOLDER, new Set(Object.keys(kept).map((id) => `${id}.pdf`)));
}

// everything: الحساب حُذف، فلا شيء يُنتظر رفعه
export async function clearWebAccountFiles({ everything = false } = {}) {
  if (Capacitor.isNativePlatform()) return;
  await clearRecordings(everything).catch(() => {});
  await clearIjazaFiles(everything).catch(() => {});
}
