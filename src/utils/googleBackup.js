import { loadStoredState, saveStoredState } from './persistence';
import { SESSION_STORAGE_KEYS } from './deviceData';
import { getAccessToken, findFile, saveFile, readFile } from './googleDrive';

// ─── نسخة البيانات في جوجل درايف ───
// ملف واحد في مجلّد التطبيق المخفي يُستبدل كل مرة. فيه ما يحفظه التطبيق عن المستخدم على
// الجهاز (حالة التطبيق، الحفظ، الإجازات، الختمات، الاختبارات، التفضيلات) — لا بيانات الدخول،
// ولا ملفّات التسجيلات والإجازات (تبقى على السيرفر).
const FILE_NAME = 'khumassiyat-backup.json';
const LAST_KEY = 'quran-fives-google-backup-last-v1';
export const DAY_MS = 24 * 60 * 60 * 1000;

export const BACKUP_KEYS = [
  ...SESSION_STORAGE_KEYS,
  'quran-fives-khitma-cache-v1',
  'quran-fives-playback-rate-v1',
  'quran-fives-verse-style-v1',
  'quran-fives-keep-lap-v1',
  'quran-fives-hifz-voice-v1',
];

export function buildBackup(now = Date.now()) {
  const data = {};
  for (const key of BACKUP_KEYS) {
    const value = loadStoredState(key);
    if (value !== null && value !== undefined) data[key] = value;
  }
  return { app: 'khumassiyat', version: 1, savedAt: now, data };
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

export async function backupNow({ interactive }) {
  const token = await getAccessToken({ interactive });
  if (!token) return null;
  const backup = buildBackup();
  await saveFile(token, FILE_NAME, JSON.stringify(backup));
  saveStoredState(LAST_KEY, backup.savedAt);
  return backup.savedAt;
}

// النسخة على درايف: { savedAt } أو null إن لم توجد
export async function remoteBackupInfo() {
  const token = await getAccessToken({ interactive: true });
  const file = await findFile(token, FILE_NAME);
  return file ? { id: file.id, savedAt: new Date(file.modifiedTime).getTime() } : null;
}

export async function restoreBackup() {
  const token = await getAccessToken({ interactive: true });
  const file = await findFile(token, FILE_NAME);
  if (!file) return false;
  applyBackup(JSON.parse(await readFile(token, file.id)));
  return true;
}

// النسخ اليومي: بلا نافذة جوجل — بالمفتاح الصالح أو المجدَّد بصمت، وإلا انتظر
export async function dailyBackupIfDue(now = Date.now()) {
  if (now - lastBackupAt() < DAY_MS) return null;
  return backupNow({ interactive: false });
}
