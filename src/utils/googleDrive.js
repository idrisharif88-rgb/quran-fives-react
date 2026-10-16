import { SocialLogin } from '@capgo/capacitor-social-login';

// ─── جوجل درايف: مجلّد التطبيق المخفي في درايف المستخدم ───
// الصلاحية drive.appdata وحدها: يرى التطبيق ملفّاته هو فقط، لا ملفّات المستخدم.
// المفتاح (access token) يعيش ساعة تقريباً، ويُحفظ محلياً ليُستعمل في النسخ اليومي دون نافذة جوجل.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '';
export const GOOGLE_ENABLED = Boolean(GOOGLE_CLIENT_ID);

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const TOKEN_KEY = 'quran-fives-google-token-v1';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const MARGIN_MS = 5 * 60 * 1000;   // مفتاح ينتهي خلال خمس دقائق يُعدّ منتهياً

let initialized = null;
const init = () => {
  if (!initialized) {
    initialized = SocialLogin.initialize({ google: { webClientId: GOOGLE_CLIENT_ID, mode: 'online' } });
    initialized.catch(() => { initialized = null; });
  }
  return initialized;
};

const readToken = () => {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY)); } catch { return null; }
};
const writeToken = (value) => {
  try {
    if (value) localStorage.setItem(TOKEN_KEY, JSON.stringify(value));
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* تجاهل فشل التخزين */ }
};

// الحساب المربوط (بريده) إن وُجد — يبقى بعد انتهاء المفتاح
export const linkedEmail = () => readToken()?.email || null;

/**
 * مفتاح درايف صالح. interactive=false لا يفتح نافذة جوجل: يعيد null إن انتهى المفتاح.
 */
export async function getAccessToken({ interactive }) {
  const saved = readToken();
  if (saved?.token && saved.expiresAt - MARGIN_MS > Date.now()) return saved.token;
  if (!interactive) return null;
  await init();
  const { result } = await SocialLogin.login({ provider: 'google', options: { scopes: ['email', SCOPE] } });
  const token = result?.accessToken?.token;
  if (!token) throw new Error('لم يمنح جوجل صلاحية درايف');
  const expires = result.accessToken.expires ? new Date(result.accessToken.expires).getTime() : NaN;
  writeToken({
    token,
    expiresAt: Number.isFinite(expires) ? expires : Date.now() + 55 * 60 * 1000,
    email: result.profile?.email || saved?.email || null,
  });
  return token;
}

export async function unlinkGoogle() {
  writeToken(null);
  try { await init(); await SocialLogin.logout({ provider: 'google' }); } catch { /* لم يكن مربوطاً */ }
}

async function drive(token, url, options = {}) {
  const res = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  if (res.status === 401) writeToken({ ...readToken(), token: null, expiresAt: 0 });
  if (!res.ok) {
    const err = new Error('drive http ' + res.status);
    err.status = res.status;
    throw err;
  }
  return res;
}

// { id, modifiedTime, size } أو null
export async function findFile(token, name) {
  const q = encodeURIComponent(`name = '${name}'`);
  const res = await drive(token, `${API}/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime,size)`);
  return (await res.json()).files?.[0] || null;
}

// ينشئ الملف أو يستبدل محتواه (رفع multipart: البيانات الوصفية والمحتوى في طلب واحد)
export async function saveFile(token, name, text) {
  const existing = await findFile(token, name);
  const boundary = 'khumassiyat' + Date.now();
  const metadata = existing ? {} : { name, parents: ['appDataFolder'] };
  const body = [
    `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', JSON.stringify(metadata),
    `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', text,
    `--${boundary}--`, '',
  ].join('\r\n');
  const url = existing
    ? `${UPLOAD}/files/${existing.id}?uploadType=multipart&fields=id,modifiedTime,size`
    : `${UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime,size`;
  const res = await drive(token, url, {
    method: existing ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return res.json();
}

export async function readFile(token, id) {
  return (await drive(token, `${API}/files/${id}?alt=media`)).text();
}
