import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { migrateLegacyOwner, validateEmail } from './accounts.js';
import { createMailer } from './mailer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
// سقف عدد الحسابات — يُرفع بتغيير المتغيّر وإعادة التشغيل، بلا إصدار جديد للتطبيق
const MAX_USERS = Number(process.env.MAX_USERS) || 100;

// رموز التأكيد والاسترجاع تُرسل بالبريد عبر Resend. MAIL_FROM عنوان على نطاق موثّق هناك.
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const MAIL_FROM = process.env.MAIL_FROM || '';
if (!RESEND_API_KEY || !MAIL_FROM) {
  console.warn('تنبيه: RESEND_API_KEY أو MAIL_FROM غير مضبوط — رموز التأكيد تُطبع في السجلّ ولا تُرسل.');
}
// المرسِل: «اسم <بريد@نطاق>» أو بريد مجرّد. بلا القوسين يرفض Resend كل رسالة (422)
// فلا يدخل أحد — نوقف التشغيل برسالة واضحة بدل فشل صامت عند أوّل دخول.
if (MAIL_FROM && !/^([^<>]*<[^<>\s@]+@[^<>\s@]+>|[^<>\s@]+@[^<>\s@]+)$/.test(MAIL_FROM.trim())) {
  console.error(`MAIL_FROM غير صالح: «${MAIL_FROM}» — الصيغة: خماسيات <no-reply@example.com>`);
  process.exit(1);
}
const sendMail = createMailer({ apiKey: MAIL_FROM && RESEND_API_KEY, from: MAIL_FROM });

// بيانات المالك القديمة (KHITMA_USER/KHITMA_CODE) تُستعمل لنقل بياناته إلى حسابه
// مرّة واحدة فقط؛ بعدها لا حاجة إليها. OWNER_EMAIL يجعل حسابه بريدياً كغيره
// (يدخل به وبكلمة سرّه القديمة KHITMA_CODE)، و OWNER_NAME اسم الترحيب.
// والمالك هو المشرف: يوافق على الحسابات الجديدة قبل أن تزامن.
const OWNER_EMAIL = (process.env.OWNER_EMAIL || '').trim();
if (OWNER_EMAIL && validateEmail(OWNER_EMAIL)) {
  console.error('OWNER_EMAIL ليس بريداً صالحاً — صحّحه ثم أعد التشغيل.');
  process.exit(1);
}
const owner = OWNER_EMAIL || process.env.KHITMA_USER || '';
if (!owner) console.warn('تنبيه: لا OWNER_EMAIL ولا KHITMA_USER — لا مشرف يوافق على الحسابات الجديدة.');

const { app, store, accounts } = createApp({ dataDir: DATA_DIR, maxUsers: MAX_USERS, sendMail, adminUser: owner });

const migrated = await migrateLegacyOwner({
  store,
  accounts,
  dataDir: DATA_DIR,
  user: owner,
  code: process.env.KHITMA_CODE,
  name: process.env.OWNER_NAME || process.env.KHITMA_USER,
});
if (migrated) console.log(`نُقلت بيانات المالك إلى حسابه: ${owner}`);

app.listen(PORT, () => {
  console.log(`خادم المزامنة يعمل على المنفذ ${PORT} — الحدّ الأقصى ${MAX_USERS} مستخدم`);
});
