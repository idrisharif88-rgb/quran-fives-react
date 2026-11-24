import { Capacitor } from '@capacitor/core';
import { SYNC_URL, SYNC_ENABLED } from './syncConfig';
import { readAccount } from './syncAccount';

// ─── سجلّ الأخطاء: يُرسل إلى الخادم تلقائياً (server/errorLogRoutes.js)، ويقرؤه المالك وحده ───
// كما في التطبيقات الكبيرة: بلا سؤال، ومن كل مستخدم (بحساب أو بلا حساب). معرّف تثبيت عشوائي
// يميّز الجهاز، وبريد الحساب إن كان داخلاً. لا كلمات سرّ ولا مفاتيح ولا نصوص المستخدم.

const QUEUE_KEY = 'quran-fives-error-queue-v1';
const INSTALL_KEY = 'quran-fives-install-id-v1';   // إعداد جهاز: لا يُزامَن ولا يُمسح بالخروج
const MAX_QUEUE = 50;
const SAME_MS = 60 * 1000;   // الخطأ نفسه خلال دقيقة: يُعدّ ولا يُكرَّر
const VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';   // eslint-disable-line no-undef

export function scrub(text) {
  return String(text ?? '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
    .replace(/\bses\.[\w-]+/g, '<token>')
    .replace(/\bBasic\s+[A-Za-z0-9+/=]+/g, 'Basic <hidden>')
    .replace(/\bBearer\s+[\w.-]+/g, 'Bearer <hidden>')
    .replace(/([?&](?:code|token|key|password)=)[^&\s]+/gi, '$1<hidden>');
}

const readQueue = () => {
  try { const q = JSON.parse(localStorage.getItem(QUEUE_KEY)); return Array.isArray(q) ? q : []; } catch { return []; }
};
const writeQueue = (q) => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE))); } catch { /* ممتلئ */ } };

function installId() {
  try {
    let id = localStorage.getItem(INSTALL_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(INSTALL_KEY, id);
    }
    return id;
  } catch { return 'unknown'; }
}

const platform = () => {
  try { return Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'; } catch { return 'web'; }
};

let flushTimer = null;
let flushing = false;

/**
 * يسجّل خطأً. kind: 'crash' | 'promise' | 'sync' | 'network' | …، where: أين وقع (اسم الدالّة أو الشاشة).
 * لا يرمي أبداً: سجلّ الأخطاء لا يجوز أن يكون سبب خطأ.
 */
export function logError(kind, error, where) {
  try {
    // بلا شبكة: فشل المزامنة متوقَّع، وليس خطأً يُبلَّغ عنه
    if (!error?.status && typeof navigator !== 'undefined' && navigator.onLine === false && kind !== 'crash') return;
    const message = scrub(error?.message || error || 'unknown').slice(0, 500);
    const stack = error?.stack ? scrub(error.stack).slice(0, 2000) : undefined;
    const status = error?.status ? ` (http ${error.status})` : '';
    const now = Date.now();
    const q = readQueue();
    const last = q[q.length - 1];
    if (last && last.kind === kind && last.message === message + status && now - last.at < SAME_MS) {
      last.count = (last.count || 1) + 1;
    } else {
      q.push({ at: now, kind, message: message + status, stack, where: where ? scrub(where).slice(0, 120) : undefined, count: 1 });
    }
    writeQueue(q);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flushErrors, 5000);
  } catch { /* تجاهل */ }
}

/** يرسل ما في الطابور. ما لم يصل يبقى للمرّة التالية (فتح التطبيق أو خطأ جديد). */
export async function flushErrors() {
  if (!SYNC_ENABLED || flushing) return;
  const q = readQueue();
  if (!q.length) return;
  flushing = true;
  try {
    const batch = q.slice(0, 20);
    const res = await fetch(`${SYNC_URL}/api/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installId: installId(), user: readAccount()?.user, version: VERSION, platform: platform(), entries: batch }),
    });
    // 4xx غير 429: الطلب نفسه مرفوض، فلا فائدة من إعادته إلى الأبد
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
      writeQueue(readQueue().slice(batch.length));
      if (readQueue().length) setTimeout(flushErrors, 1000);
    }
  } catch { /* بلا شبكة: يبقى في الطابور */ } finally {
    flushing = false;
  }
}

/** يلتقط ما يفلت من التطبيق، ويرسل طابور الجلسة السابقة. يُستدعى مرّة في main.jsx. */
export function startErrorLog() {
  window.addEventListener('error', (e) => logError('crash', e.error || e.message, e.filename ? `${e.filename}:${e.lineno}` : undefined));
  window.addEventListener('unhandledrejection', (e) => logError('promise', e.reason));
  setTimeout(flushErrors, 3000);
}
