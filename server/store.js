import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// الاسم بصيغته الموحّدة: «Ahmad» و« ahmad » حساب واحد
export function normalizeUser(user) {
  return String(user ?? '').normalize('NFKC').trim().toLowerCase();
}

// اسم مجلّد المستخدم مشتقّ من بصمة الاسم لا من الاسم نفسه: يقبل أي حروف (عربية
// وغيرها) ولا يمكن لاسم مثل «../» أن يخرج من مجلّد البيانات.
export function userKey(user) {
  return createHash('sha256').update(normalizeUser(user)).digest('hex').slice(0, 32);
}

// تخزين ملفّات: مجلّد لكل مستخدم تحت data/<subdir>/<key>/
// users للحسابات وبياناتها، و pending لرموز التأكيد المؤقّتة.
export function createStore(dataDir, subdir = 'users') {
  const usersDir = path.join(dataDir, subdir);

  const fileOf = (key, name) => path.join(usersDir, key, name);

  async function read(key, name, fallback) {
    try {
      return JSON.parse(await fs.readFile(fileOf(key, name), 'utf8'));
    } catch {
      return fallback;
    }
  }

  // كتابة ذرّية: نكتب لملف مؤقت ثم نعيد تسميته لتفادي تلف الملف عند انقطاع
  async function write(key, name, record) {
    const file = fileOf(key, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(record), 'utf8');
    await fs.rename(tmp, file);
  }

  // إنشاء حصري: يفشل إن وُجد الملف، فلا يفوز تسجيلان متزامنان بالاسم نفسه
  async function createExclusive(key, name, record) {
    const file = fileOf(key, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    try {
      await fs.writeFile(file, JSON.stringify(record), { encoding: 'utf8', flag: 'wx' });
      return true;
    } catch (e) {
      if (e.code === 'EEXIST') return false;
      throw e;
    }
  }

  async function remove(key, name) {
    await fs.rm(fileOf(key, name), { force: true });
  }

  async function listKeys() {
    try {
      const entries = await fs.readdir(usersDir, { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).map(e => e.name);
    } catch {
      return [];
    }
  }

  async function countUsers() {
    return (await listKeys()).length;
  }

  return { read, write, createExclusive, remove, listKeys, countUsers };
}
