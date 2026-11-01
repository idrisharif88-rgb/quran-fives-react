import { APP_STORAGE_KEY, loadStoredState, saveStoredState, removeStoredState } from './persistence';
import { SESSION_STORAGE_KEYS, isPristineState } from './deviceData';
import { getAccessToken, findFile, saveFile, readFile, unlinkGoogle, linkedEmail } from './googleDrive';
import { filesIndex, backupFiles, restoreFiles } from './googleBackupFiles';

// ─── نسخة البيانات في جوجل درايف ───
// ملف واحد في مجلّد التطبيق المخفي يُستبدل كل مرة. فيه ما يحفظه التطبيق عن المستخدم على
// الجهاز (حالة التطبيق، الحفظ، الإجازات، الختمات، الاختبارات، التفضيلات، التذكيرات) — لا بيانات
// الدخول. التسجيلات وملفّات الإجازات ملفّات مستقلّة بجانبه (googleBackupFiles.js)، وفهرساها فيه.
// حجم العرض إعداد جهاز لا يُنسخ: سقفه يختلف من جهاز لآخر.
const FILE_NAME = 'khumassiyat-backup.json';
const LAST_KEY = 'quran-fives-google-backup-last-v1';
const OFFER_KEY = 'quran-fives-drive-offer-seen-v1';   // الحساب الذي عُرض عليه الاسترجاع
const UNLINK_WAIT_MS = 3000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const BACKUP_KEYS = [
  ...SESSION_STORAGE_KEYS,
  'quran-fives-khitma-cache-v1',
  'quran-fives-playback-rate-v1',
  'quran-fives-verse-style-v1',
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

// يكتب النسخة فوق بيانات الجهاز؛ مفاتيح ليست في النسخة تُترك كما هي.
// الكتابة مباشرة لا عبر saveStoredState: LOCAL_SYNC_EVENT يجعل App يعيد حفظ حالته التي في الذاكرة
// فوق حالة التطبيق المسترجَعة، فتضيع قبل إعادة التحميل.
export function applyBackup(backup) {
  if (backup?.app !== 'khumassiyat' || typeof backup.data !== 'object' || !backup.data) {
    throw new Error('ملف النسخة غير صالح');
  }
  for (const key of BACKUP_KEYS) {
    if (key in backup.data) window.localStorage.setItem(key, JSON.stringify(backup.data[key]));
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

// ربط حساب جوجل وحده. لا يحفظ شيئاً: هاتف جديد لو حفظ عند الربط لكتب نسخة فارغة فوق نسخة صاحبه
export const linkGoogle = () => getAccessToken({ interactive: true });

// النسخة على درايف: { backup, savedAt }، أو { status: 'none' } بلا نسخة، أو { status: 'locked' } إن لزم تأكيد جوجل
export async function readRemoteBackup({ interactive = false } = {}) {
  const token = await getAccessToken({ interactive });
  if (!token) return { status: 'locked' };
  const file = await findFile(token, FILE_NAME);
  if (!file) return { status: 'none' };
  return { backup: JSON.parse(await readFile(token, file.id)), savedAt: new Date(file.modifiedTime).getTime() };
}

export async function restoreBackup(onProgress) {
  const token = await getAccessToken({ interactive: true });
  const file = await findFile(token, FILE_NAME);
  if (!file) return false;
  const backup = JSON.parse(await readFile(token, file.id));
  // الملفّات أوّلاً، والبيانات آخراً قبيل إعادة التحميل: أيّ تغيير في App أثناء تنزيل طويل
  // كان سيعيد حفظ حالته فوق المسترجَعة
  await restoreFiles(token, backup.files, onProgress);
  applyBackup(backup);
  return true;
}

// النسخ اليومي: بلا نافذة جوجل — بالمفتاح الصالح أو المجدَّد بصمت، وإلا انتظر
export async function dailyBackupIfDue(now = Date.now()) {
  if (now - lastBackupAt() < DAY_MS) return null;
  // بعد تسجيل الخروج الجهاز فارغ، ونسخة فارغة هنا كانت ستحلّ محلّ نسخة المستخدم في درايف
  if (isPristineState(loadStoredState(APP_STORAGE_KEY))) return null;
  return backupNow({ interactive: false });
}

// عرض الاسترجاع بعد الدخول (DriveRestoreOffer): مرة واحدة لكل دخول
export const driveOfferSeen = (user) => loadStoredState(OFFER_KEY) === user;
export const markDriveOfferSeen = (user) => saveStoredState(OFFER_KEY, user);

// الخروج: ربط جوجل وآخر نسخة يخصّان صاحبهما. لو بقيا لذهبت نسخة المستخدم التالي إلى درايف السابق.
// خروج جوجل بلا اتصال قد لا يعود أبداً، فلا ينتظره الخروج من التطبيق أكثر من ثوانٍ.
export async function forgetGoogleLink() {
  removeStoredState(LAST_KEY);
  removeStoredState(OFFER_KEY);
  if (!linkedEmail()) return;
  await Promise.race([
    unlinkGoogle(),
    new Promise((resolve) => { setTimeout(resolve, UNLINK_WAIT_MS); }),
  ]);
}
