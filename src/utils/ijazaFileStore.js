import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { loadStoredState, saveStoredState } from './persistence';
import { canReachServer, fetchRemoteIndex, uploadFile, deleteRemoteFile, downloadFile } from './fileRemote';

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
// الملف الجديد يُكتب هنا أولاً، ولا يحلّ محلّ القديم إلا بعد اكتمال الحفظ والرفع — الإلغاء لا يمسّ القديم
const partOf = (id) => `${FOLDER}/${id}.part.pdf`;
// حذفٌ لم يصل السيرفر (بلا شبكة): يُعاد عند فتح أي إجازة لاحقاً
const PENDING_DELETES_KEY = 'quran-fives-ijaza-deletes-v1';

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
async function writeLocal(id, blob, { path = pathOf(id), onProgress, signal } = {}) {
  for (let at = 0; at < blob.size; at += CHUNK_BYTES) {
    if (signal?.aborted) throw new DOMException('cancelled', 'AbortError');
    const data = await blobToBase64(blob.slice(at, at + CHUNK_BYTES));
    if (at === 0) await Filesystem.writeFile({ path, data, directory: Directory.Data, recursive: true });
    else await Filesystem.appendFile({ path, data, directory: Directory.Data });
    onProgress?.(Math.min(1, (at + CHUNK_BYTES) / blob.size));
  }
}

const loadDeletes = () => {
  const saved = loadStoredState(PENDING_DELETES_KEY);
  return Array.isArray(saved) ? saved : [];
};

async function flushDeletes() {
  const pending = loadDeletes();
  if (!pending.length || !canReachServer()) return pending;
  const still = [];
  for (const id of pending) {
    try { await deleteRemoteFile('ijaza', id); } catch { still.push(id); }
  }
  saveStoredState(PENDING_DELETES_KEY, still);
  return still;
}

const hasLocal = (id) => Filesystem.stat({ path: pathOf(id), directory: Directory.Data }).then(() => true, () => false);

async function readLocalBlob(id) {
  const { data } = await Filesystem.readFile({ path: pathOf(id), directory: Directory.Data });
  return typeof data === 'string' ? base64ToBlob(data) : data;
}

/**
 * يحفظ الملف على الجهاز ويرفعه (ويستبدل السابق). يعيد مدخل الفهرس الجديد.
 * onProgress(0..1): الحفظ على الجهاز أول ربع، والرفع الباقي. signal يلغي العملية فيبقى الملف السابق.
 * فشل الرفع لا يُفشل الإرفاق: يبقى على الجهاز (uploaded: false) ويُرفع لاحقاً.
 */
export async function attachIjazaFile(id, file, { onProgress, signal } = {}) {
  const online = canReachServer();
  const localShare = online ? 0.25 : 1;
  const part = partOf(id);
  try {
    await writeLocal(id, file, { path: part, signal, onProgress: (p) => onProgress?.(p * localShare) });
    let uploaded = false;
    if (online) {
      // حذف مؤجَّل لملف سابق بالمعرّف نفسه لا يجوز أن يمحو الملف الجديد بعد رفعه
      saveStoredState(PENDING_DELETES_KEY, loadDeletes().filter((x) => x !== id));
      try {
        await uploadFile('ijaza', id, file, { name: file.name, mime: 'application/pdf' }, {
          signal,
          onProgress: (p) => onProgress?.(localShare + p * (1 - localShare)),
        });
        uploaded = true;
      } catch (e) {
        if (e?.name === 'AbortError') throw e;
      }
    }
    await Filesystem.deleteFile({ path: pathOf(id), directory: Directory.Data }).catch(() => {});
    await Filesystem.rename({ from: part, to: pathOf(id), directory: Directory.Data });
    onProgress?.(1);
    return setEntry(id, { name: file.name, size: file.size, addedAt: Date.now(), uploaded })[id];
  } catch (e) {
    await Filesystem.deleteFile({ path: part, directory: Directory.Data }).catch(() => {});
    throw e;
  }
}

// يُحذف من الجهاز فوراً، ومن السيرفر في الخلفية (أو لاحقاً إن تعذّر)، فلا ينتظر المستخدم الشبكة
export async function removeIjazaFile(id) {
  await Filesystem.deleteFile({ path: pathOf(id), directory: Directory.Data }).catch(() => {});
  const wasUploaded = loadIjazaFiles()[id]?.uploaded !== false;
  setEntry(id, null);
  if (!wasUploaded) return;
  saveStoredState(PENDING_DELETES_KEY, [...new Set([...loadDeletes(), id])]);
  flushDeletes().catch(() => {});
}

/**
 * يوفّق بين الجهاز والسيرفر لإجازة واحدة: يرفع ملفاً لم يُرفع، أو يعرّف بملف على
 * السيرفر لا نسخة له هنا (جهاز جديد). يعيد مدخل الفهرس أو null.
 */
export async function syncIjazaFile(id) {
  const local = loadIjazaFiles()[id];
  if (!canReachServer()) return local || null;
  const pendingDeletes = await flushDeletes().catch(() => loadDeletes());
  if (pendingDeletes.includes(id)) return null;
  // uploaded غائب: ملف أُرفق قبل أن يصير للإجازة نسخة على السيرفر
  if (local && local.uploaded !== true) {
    if (!await hasLocal(id)) return local;
    await uploadFile('ijaza', id, await readLocalBlob(id), { name: local.name, mime: 'application/pdf' });
    return setEntry(id, { ...local, uploaded: true })[id];
  }
  if (local) return local;
  const remote = (await fetchRemoteIndex('ijaza'))[id];
  return remote ? { ...remote, uploaded: true, remoteOnly: true } : null;
}

// يفتح الملف: نسخة الجهاز إن وُجدت، وإلا يُنزَّل من السيرفر أولاً ويُحفظ نسخة.
// على الهاتف عبر قائمة المشاركة (يختار قارئ PDF)، وفي المتصفح في لسان جديد.
export async function openIjazaFile(id, name) {
  let blob = null;
  if (!await hasLocal(id)) {
    blob = await downloadFile('ijaza', id, pathOf(id));
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
