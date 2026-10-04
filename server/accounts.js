import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { normalizeUser, userKey } from './store.js';

const scryptAsync = promisify(scrypt);
const ACCOUNT_FILE = 'account.json';
const KEY_LEN = 32;

async function hashCode(code, salt) {
  return scryptAsync(String(code), salt, KEY_LEN);
}

const EMAIL_RE = /^[^\s@:]+@[^\s@:]+\.[^\s@:]+$/;

// شروط التسجيل الجديد فقط: الحساب الجديد بريد إلكتروني. الدخول لا يفحصها، فحساب
// المالك المنقول (اسم لا بريد) يبقى صالحاً مهما كان اسمه أو طول رمزه القديم.
export function validateEmail(user) {
  const email = normalizeUser(user);
  return email.length <= 254 && EMAIL_RE.test(email) ? null : 'بريد إلكتروني غير صالح';
}

// الاسم الذي يُرحَّب به المستخدم — للعرض فقط، لا يدخل به
export function validateName(name) {
  const clean = typeof name === 'string' ? name.trim() : '';
  // eslint-disable-next-line no-control-regex
  return clean.length >= 2 && clean.length <= 40 && !/[\u0000-\u001f<>]/.test(clean)
    ? null : 'الاسم من حرفين إلى 40 حرفاً';
}

export function validateCode(code) {
  return typeof code === 'string' && code.length >= 6 && code.length <= 128
    ? null : 'كلمة السر 6 أحرف على الأقل';
}

export function createAccounts(store, { maxUsers }) {
  async function exists(user) {
    return Boolean(await store.read(userKey(user), ACCOUNT_FILE, null));
  }

  const isFull = async () => await store.countUsers() >= maxUsers;

  // بصمة كلمة السر — تُحفظ هي لا الكلمة نفسها، حتى في التسجيل المعلّق على التأكيد
  async function hashNew(code) {
    const salt = randomBytes(16);
    const hash = await hashCode(code, salt);
    return { salt: salt.toString('hex'), hash: hash.toString('hex') };
  }

  // يعيد 'ok' | 'taken' | 'full'. الحساب الجديد ينتظر موافقة المشرف (approved)
  // قبل أن يُسمح له بالمزامنة؛ حساب المالك المنقول موافَق عليه من البداية.
  async function createFromHash(user, { salt, hash, name }, approved = false) {
    if (await exists(user)) return 'taken';
    if (await isFull()) return 'full';
    const created = await store.createExclusive(userKey(user), ACCOUNT_FILE, {
      user: normalizeUser(user),
      ...(name ? { name } : {}),
      salt,
      hash,
      approved,
      createdAt: Date.now(),
    });
    return created ? 'ok' : 'taken';
  }

  // موافقة المشرف أو سحبها. البيانات لا تُمسّ في الحالتين.
  async function setApproved(user, approved) {
    const key = userKey(user);
    const account = await store.read(key, ACCOUNT_FILE, null);
    if (!account) return false;
    await store.write(key, ACCOUNT_FILE, { ...account, approved: Boolean(approved) });
    return true;
  }

  // كل الحسابات للوحة المشرف — بلا بصمات كلمات السر
  async function list() {
    const accounts = await Promise.all((await store.listKeys()).map(key => store.read(key, ACCOUNT_FILE, null)));
    return accounts
      .filter(Boolean)
      .map(a => ({ user: a.user, name: a.name || a.user, createdAt: a.createdAt, approved: a.approved === true }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  // اسم العرض؛ حساب المالك المنقول بلا اسم فيُعاد اسم دخوله
  async function nameOf(user) {
    const account = await store.read(userKey(user), ACCOUNT_FILE, null);
    return account?.name || account?.user || '';
  }

  async function create(user, code, name, approved = false) {
    return createFromHash(user, { ...await hashNew(code), name }, approved);
  }

  // كلمة سر جديدة لحساب قائم (بعد تأكيد رمز الاسترجاع)
  async function setCode(user, code) {
    const key = userKey(user);
    const account = await store.read(key, ACCOUNT_FILE, null);
    if (!account) return false;
    await store.write(key, ACCOUNT_FILE, { ...account, ...(await hashNew(code)) });
    return true;
  }

  // يعيد { key, approved } إن صحّت البيانات، وإلا null
  async function verify(user, code) {
    const key = userKey(user);
    const account = await store.read(key, ACCOUNT_FILE, null);
    // حساب غير موجود: نحسب بصمة وهمية كي لا يكشف زمنُ الردّ وجودَ الاسم من عدمه
    const salt = Buffer.from(account?.salt || '00'.repeat(16), 'hex');
    const actual = await hashCode(code, salt);
    if (!account) return null;
    const expected = Buffer.from(account.hash, 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    return { key, approved: account.approved === true };
  }

  return { exists, isFull, hashNew, createFromHash, create, setCode, setApproved, list, verify, nameOf };
}

// نقل بيانات المالك لمرّة واحدة: الخادم القديم كان يخزّن حالة واحدة مشتركة
// (state.json) وسجلّ ختمات واحداً (khitma.json) ببيانات دخول من البيئة.
// نُنشئ للمالك حساباً بكلمة سرّه نفسها وننسخ ملفّيه إليه كما هما. الملفّان الأصليان
// يبقيان نسخة احتياطية. لا يتكرّر: وجود الحساب يوقفه.
// user: بريد المالك (OWNER_EMAIL) فيصير حسابه كغيره بتحقّق بخطوتين واسترجاع بالبريد،
// وإلا اسمه القديم (KHITMA_USER) فيبقى بكلمة السر وحدها.
export async function migrateLegacyOwner({ store, accounts, dataDir, user, code, name }) {
  if (!user || !code) return false;
  const key = userKey(user);
  if (await store.read(key, ACCOUNT_FILE, null)) return false;
  // البيانات أوّلاً ثم الحساب: لو انقطع التشغيل بينهما أُعيد النقل كاملاً في المرّة التالية
  for (const name of ['state.json', 'khitma.json']) {
    try {
      const record = JSON.parse(await fs.readFile(path.join(dataDir, name), 'utf8'));
      await store.write(key, name, record);
    } catch {
      // لا ملف قديم بهذا الاسم — لا شيء يُنقل
    }
  }
  return await accounts.create(user, code, name, true) === 'ok';
}
