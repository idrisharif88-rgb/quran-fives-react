import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { loadStoredState, saveStoredState } from './persistence';
import { canReachServer, fetchRemoteIndex, uploadFile, deleteRemoteFile, downloadFile } from './ijazaFileRemote';

// ─── ملف الإجازة (PDF) ───
// الأصل على السيرفر (لكل حساب)، ونسخة على الجهاز في مساحة التطبيق تُفتح بلا شبكة.
// الفهرس المحلي { [معرّف الإجازة]: { name, size, addedAt, uploaded } }؛ uploaded=false
// ملف لم يصل السيرفر بعد (بلا شبكة أو بلا حساب) فيُرفع عند فتح الإجازة لاحقاً.
const INDEX_KEY = 'quran-fives-ijaza-files-v1';
const FOLDER = 'ijaza-files';
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
// أجزاء الكتابة على الجهاز: مضاعف 3 كي يُرمَّز كل جزء base64 وحده بلا حشو في وسطه
const CHUNK_BYTES = 3 * 1024 * 1024;

const pathOf = (id) => `${FOLDER}/${id}.pdf`;

export function loadIjazaFiles() {
  const index = loadStoredState(INDEX_KEY);
  return index && typeof index === 'object' && !Array.isArray(index) ? index : {};
}

function setEntry(id, entry) {
  const index = { ...loadIjazaFiles() };
  if (entry) index[id] = entry;
  else delete index[id];
  saveStoredState(INDEX_KEY, index);
  return index;
}

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

function base64ToBlob(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'application/pdf' });
}

// الملف الكبير يُكتب على أجزاء، فلا يتحوّل كله إلى نص في الذاكرة دفعة واحدة
async function writeLocal(id, blob) {
  const path = pathOf(id);
  for (let at = 0; at < blob.size; at += CHUNK_BYTES) {
    const data = await blobToBase64(blob.slice(at, at + CHUNK_BYTES));
    if (at === 0) await Filesystem.writeFile({ path, data, directory: Directory.Data, recursive: true });
    else await Filesystem.appendFile({ path, data, directory: Directory.Data });
  }
}

const hasLocal = (id) => Filesystem.stat({ path: pathOf(id), directory: Directory.Data }).then(() => true, () => false);

async function readLocalBlob(id) {
  const { data } = await Filesystem.readFile({ path: pathOf(id), directory: Directory.Data });
  return typeof data === 'string' ? base64ToBlob(data) : data;
}

// يحفظ الملف على الجهاز ويرفعه (ويستبدل السابق). يعيد مدخل الفهرس الجديد.
export async function attachIjazaFile(id, file) {
  await writeLocal(id, file);
  let entry = { name: file.name, size: file.size, addedAt: Date.now(), uploaded: false };
  setEntry(id, entry);
  if (canReachServer()) {
    try {
      await uploadFile(id, file, file.name);
      entry = { ...entry, uploaded: true };
      setEntry(id, entry);
    } catch {
      // يبقى على الجهاز ويُرفع لاحقاً
    }
  }
  return entry;
}

export async function removeIjazaFile(id) {
  await Filesystem.deleteFile({ path: pathOf(id), directory: Directory.Data }).catch(() => {});
  setEntry(id, null);
  if (canReachServer()) await deleteRemoteFile(id).catch(() => {});
}

/**
 * يوفّق بين الجهاز والسيرفر لإجازة واحدة: يرفع ملفاً لم يُرفع، أو يعرّف بملف على
 * السيرفر لا نسخة له هنا (جهاز جديد). يعيد مدخل الفهرس أو null.
 */
export async function syncIjazaFile(id) {
  const local = loadIjazaFiles()[id];
  if (!canReachServer()) return local || null;
  // uploaded غائب: ملف أُرفق قبل أن يصير للإجازة نسخة على السيرفر
  if (local && local.uploaded !== true) {
    if (!await hasLocal(id)) return local;
    await uploadFile(id, await readLocalBlob(id), local.name);
    return setEntry(id, { ...local, uploaded: true })[id];
  }
  if (local) return local;
  const remote = (await fetchRemoteIndex())[id];
  return remote ? { ...remote, uploaded: true, remoteOnly: true } : null;
}

// يفتح الملف: نسخة الجهاز إن وُجدت، وإلا يُنزَّل من السيرفر أولاً ويُحفظ نسخة.
// على الهاتف عبر قائمة المشاركة (يختار قارئ PDF)، وفي المتصفح في لسان جديد.
export async function openIjazaFile(id, name) {
  let blob = null;
  if (!await hasLocal(id)) {
    blob = await downloadFile(id, pathOf(id));
    if (blob) await writeLocal(id, blob);
    const { size } = await Filesystem.stat({ path: pathOf(id), directory: Directory.Data });
    setEntry(id, { name, size, addedAt: Date.now(), uploaded: true });
  }

  if (Capacitor.isNativePlatform()) {
    // المشاركة لا تصل إلى مساحة التطبيق الخاصة، فتُنسخ نسخة مؤقتة إلى الذاكرة المؤقتة (نسخ أصلي بلا ذاكرة)
    const temp = (name || 'ijaza.pdf').replace(/[\\/:*?"<>|]/g, '_');
    await Filesystem.copy({ from: pathOf(id), directory: Directory.Data, to: temp, toDirectory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: temp, directory: Directory.Cache });
    await Share.share({ title: name, files: [uri] }).catch(() => {});
    return;
  }
  window.open(URL.createObjectURL(blob || await readLocalBlob(id)), '_blank');
}
