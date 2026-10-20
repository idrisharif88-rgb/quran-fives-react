import { loadStoredState, saveStoredState } from './persistence';
import { SESSION_STORAGE_KEYS } from './deviceData';
import { getAccessToken, findFile, saveFile, readFile } from './googleDrive';
import { filesIndex, backupFiles, restoreFiles } from './googleBackupFiles';

// ─── نسخة البيانات في جوجل درايف ───
// ملف واحد في مجلّد التطبيق المخفي يُستبدل كل مرة. فيه ما يحفظه التطبيق عن المستخدم على
// الجهاز (حالة التطبيق، الحفظ، الإجازات، الختمات، الاختبارات، التفضيلات، التذكيرات) — لا بيانات
// الدخول. التسجيلات وملفّات الإجازات ملفّات مستقلّة بجانبه (googleBackupFiles.js)، وفهرساها فيه.
// حجم العرض إعداد جهاز لا يُنسخ: سقفه يختلف من جهاز لآخر.
const FILE_NAME = 'khumassiyat-backup.json';
const LAST_KEY = 'quran-fives-google-backup-last-v1';
export const DAY_MS = 24 * 60 * 60 * 1000;

export const BACKUP_KEYS = [
  ...SESSION_STORAGE_KEYS,
  'quran-fives-khitma-cache-v1',
  'quran-fives-playback-rate-v1',
  'quran-fives-keep-lap-v1',
  'quran-fives-hifz-voice-v1',
  'quran-fives-hifz-reminder-daily-v1',   // تذكير الحفظ اليومي (hifzReminder.js)
  'quran-fives-tafsir-reminder-v1',       // ما فُسّر اليوم (useTafsirReminder)
];

export function buildBackup(now = Date.now()) {
  const data = {};
  for (const key of BACKUP_KEYS) {
    const value = loadStoredState(key);
    if (value !== null && value !== undefined) data[key] = value;
  }
  return { app: 'khumassiyat', version: 2, savedAt: now, data, files: filesIndex() };
}

// يكتب النسخة فوق بيانات الجهاز؛ مفاتيح ليست في النسخة تُترك كما هي
export function applyBackup(backup) {
  if (backup?.app !== 'khumassiyat' || typeof backup.data !== 'object' || !backup.data) {
    throw new Error('ملف النسخة غير صالح');
  }
  for (const key of BACKUP_KEYS) {
    if (key in backup.data) saveStoredState(key, backup.data[key]);
  }
}

export const lastBackupAt = () => Number(loadStoredState(LAST_KEY)) || 0;

// نسخة واحدة في كل مرة: النسخ اليومي والضغط على «احفظ الآن» معاً كانا سيرفعان الملف نفسه مرتين
let running = null;

/**
 * يرفع الملفّات الجديدة أولاً ثم ملف النسخة، فلا يشير الفهرس إلى ملف لم يصل.
 * يعيد { savedAt, failed } — failed عدد الملفّات التي تعذّر رفعها — أو null بلا مفتاح.
 */
export function backupNow({ interactive, onProgress }) {
  if (running) return running;
  running = (async () => {
    const token = await getAccessToken({ interactive });
    if (!token) return null;
    const failed = await backupFiles(token, onProgress);
    const backup = buildBackup();
    await saveFile(token, FILE_NAME, JSON.stringify(backup));
    saveStoredState(LAST_KEY, backup.savedAt);
    return { savedAt: backup.savedAt, failed };
  })().finally(() => { running = null; });
  return running;
}

// النسخة على درايف: { savedAt } أو null إن لم توجد
export async function remoteBackupInfo() {
  const token = await getAccessToken({ interactive: true });
  const file = await findFile(token, FILE_NAME);
  return file ? { id: file.id, savedAt: new Date(file.modifiedTime).getTime() } : null;
}

export async function restoreBackup(onProgress) {
  const token = await getAccessToken({ interactive: true });
  const file = await findFile(token, FILE_NAME);
  if (!file) return false;
  const backup = JSON.parse(await readFile(token, file.id));
  applyBackup(backup);
  await restoreFiles(token, backup.files, onProgress);
  return true;
}

// النسخ اليومي: بلا نافذة جوجل — بالمفتاح الصالح أو المجدَّد بصمت، وإلا انتظر
export async function dailyBackupIfDue(now = Date.now()) {
  if (now - lastBackupAt() < DAY_MS) return null;
  return backupNow({ interactive: false });
}
