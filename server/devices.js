import { createHash, randomBytes } from 'node:crypto';

const DEVICES_FILE = 'devices.json';
const MAX_DEVICES = 10;

const digest = (token) => createHash('sha256').update(String(token)).digest('hex');

// الأجهزة الموثوقة لكل حساب (التحقّق بخطوتين): الجهاز الذي أكّد رمز البريد يأخذ
// مفتاحاً عشوائياً يرسله مع كل طلب. يُحفظ من المفتاح بصمته فقط.
export function createDevices(store) {
  const list = async (key) => (await store.read(key, DEVICES_FILE, { list: [] })).list;

  async function issue(key) {
    const token = randomBytes(24).toString('base64url');
    // الأقدم يسقط عند تجاوز الحدّ
    const kept = (await list(key)).slice(-(MAX_DEVICES - 1));
    await store.write(key, DEVICES_FILE, { list: [...kept, { hash: digest(token), createdAt: Date.now() }] });
    return token;
  }

  async function has(key, token) {
    if (!token) return false;
    const hash = digest(token);
    return (await list(key)).some(d => d.hash === hash);
  }

  // يُخرج كل الأجهزة (بعد تغيير كلمة السر)
  async function clear(key) {
    await store.write(key, DEVICES_FILE, { list: [] });
  }

  return { issue, has, clear };
}
