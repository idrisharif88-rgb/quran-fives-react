import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { loadStoredState, saveStoredState } from './persistence';

// ─── ملف الإجازة (PDF) ───
// على هذا الجهاز وحده، كتسجيلات الحفظ: الملف في مساحة التطبيق (Filesystem)، وفهرسه في التخزين
// المحلي { [معرّف الإجازة]: { name, size, addedAt } }. لا يدخل حالة التطبيق المُزامَنة.
const INDEX_KEY = 'quran-fives-ijaza-files-v1';
const FOLDER = 'ijaza-files';
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const pathOf = (id) => `${FOLDER}/${id}.pdf`;

export function loadIjazaFiles() {
  const index = loadStoredState(INDEX_KEY);
  return index && typeof index === 'object' && !Array.isArray(index) ? index : {};
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

// يحفظ الملف (ويستبدل السابق) ويعيد الفهرس الجديد
export async function attachIjazaFile(id, file) {
  await Filesystem.writeFile({ path: pathOf(id), data: await blobToBase64(file), directory: Directory.Data, recursive: true });
  const index = { ...loadIjazaFiles(), [id]: { name: file.name, size: file.size, addedAt: Date.now() } };
  saveStoredState(INDEX_KEY, index);
  return index;
}

export async function removeIjazaFile(id) {
  await Filesystem.deleteFile({ path: pathOf(id), directory: Directory.Data }).catch(() => {});
  const index = { ...loadIjazaFiles() };
  delete index[id];
  saveStoredState(INDEX_KEY, index);
  return index;
}

// يفتح الملف: على الهاتف عبر قائمة المشاركة (يختار قارئ PDF)، وفي المتصفح في لسان جديد
export async function openIjazaFile(id, name) {
  const { data } = await Filesystem.readFile({ path: pathOf(id), directory: Directory.Data });
  if (Capacitor.isNativePlatform()) {
    // المشاركة لا تصل إلى مساحة التطبيق الخاصة، فتُنسخ نسخة مؤقتة إلى الذاكرة المؤقتة
    const temp = (name || 'ijaza.pdf').replace(/[\\/:*?"<>|]/g, '_');
    await Filesystem.writeFile({ path: temp, data, directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: temp, directory: Directory.Cache });
    await Share.share({ title: name, files: [uri] }).catch(() => {});
    return;
  }
  const blob = typeof data === 'string' ? base64ToBlob(data) : data;
  window.open(URL.createObjectURL(blob), '_blank');
}
