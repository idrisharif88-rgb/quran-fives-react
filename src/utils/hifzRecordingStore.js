import { Filesystem, Directory } from '@capacitor/filesystem';
import { loadStoredState, saveStoredState } from './persistence';

// ─── تسجيلات الحفظ ───
// الملف الصوتي في مساحة التطبيق على الجهاز (Filesystem)، وفهرس التسجيلات في التخزين المحلي.
// التسجيلات لا تُرفع إلى السحابة ولا تدخل حالة التطبيق المُزامَنة: تبقى على هذا الجهاز.
const INDEX_KEY = 'quran-fives-hifz-recordings-v1';
const FOLDER = 'hifz-recordings';

const EXTENSIONS = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/aac': 'aac' };
const extensionOf = (mime) => EXTENSIONS[(mime || '').split(';')[0]] || 'webm';

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

function base64ToBlob(base64, mime) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// فهرس التسجيلات: [{ id, verseIndex, s, a, refs, file, mime, durationMs, createdAt }]
// s/a أول آية؛ refs آيات الورد كلّها [{ s, a }] — تُظلَّل عند السماع. التسجيلات الأقدم بلا refs.
export function loadRecordingIndex() {
  const list = loadStoredState(INDEX_KEY);
  return Array.isArray(list) ? list.filter((r) => r && r.id && r.file) : [];
}

export const saveRecordingIndex = (list) => saveStoredState(INDEX_KEY, list);

// يحفظ المقطع ملفاً ويعيد مدخله في الفهرس
export async function writeRecording(blob, { verseIndex, s, a, refs, durationMs }) {
  const id = `${Date.now()}`;
  const mime = blob.type || 'audio/webm';
  const file = `${FOLDER}/${id}.${extensionOf(mime)}`;
  await Filesystem.writeFile({ path: file, data: await blobToBase64(blob), directory: Directory.Data, recursive: true });
  return { id, verseIndex, s, a, refs, file, mime, durationMs, createdAt: Date.now() };
}

// يقرأ المقطع ويعيد رابطاً مؤقتاً لتشغيله — على المستدعي تحريره بـURL.revokeObjectURL
export async function readRecordingUrl(recording) {
  const { data } = await Filesystem.readFile({ path: recording.file, directory: Directory.Data });
  const blob = typeof data === 'string' ? base64ToBlob(data, recording.mime) : data;
  return URL.createObjectURL(blob);
}

export async function deleteRecordingFile(recording) {
  await Filesystem.deleteFile({ path: recording.file, directory: Directory.Data }).catch(() => {});
}
