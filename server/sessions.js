import { createHash, randomBytes } from 'node:crypto';

const SESSIONS_FILE = 'sessions.json';
const MAX_SESSIONS = 10;
const LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;

// بادئة تميّز مفتاح الجلسة عن كلمة السر في ترويسة الدخول
export const SESSION_PREFIX = 'ses.';

const digest = (token) => createHash('sha256').update(String(token)).digest('hex');
const alive = (session) => Date.now() - session.createdAt < LIFETIME_MS;

// جلسات الموقع: المتصفح يحفظ هذا المفتاح بدل كلمة السر. يُحفظ من المفتاح بصمته فقط.
// لا يصلح لما يتطلّب كلمة السر نفسها (الدخول، إنشاء جلسة، حذف الحساب).
export function createSessions(store) {
  const list = async (key) => (await store.read(key, SESSIONS_FILE, { list: [] })).list.filter(alive);

  async function issue(key) {
    const token = SESSION_PREFIX + randomBytes(32).toString('base64url');
    const kept = (await list(key)).slice(-(MAX_SESSIONS - 1));
    await store.write(key, SESSIONS_FILE, { list: [...kept, { hash: digest(token), createdAt: Date.now() }] });
    return token;
  }

  async function has(key, token) {
    if (!String(token).startsWith(SESSION_PREFIX)) return false;
    const hash = digest(token);
    return (await list(key)).some(s => s.hash === hash);
  }

  async function revoke(key, token) {
    const hash = digest(token);
    await store.write(key, SESSIONS_FILE, { list: (await list(key)).filter(s => s.hash !== hash) });
  }

  // يُخرج كل المتصفّحات (بعد تغيير كلمة السر)
  async function clear(key) {
    await store.write(key, SESSIONS_FILE, { list: [] });
  }

  return { issue, has, revoke, clear };
}
