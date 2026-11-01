import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { SYNC_URL, SYNC_ENABLED } from './syncConfig';
import { readAccount, readAccountStatus, authHeaders } from './syncAccount';

// ملفات الحساب على السيرفر (server/fileRoutes.js) بأنواعها: ijaza (PDF) و hifz (تسجيلات).
// بلا حساب لا شيء يُرفع.
const route = (kind, id = '') => `${SYNC_URL}/api/files/${kind}${id ? '/' + id : ''}`;

// حساب لم يوافَق عليه (أو أوقفه المشرف ليُنسخ في جوجل درايف وحده) لا يُرفع له شيء: السيرفر يردّ 403،
// والملف كان سيُرسل كاملاً قبل الرفض
export const canReachServer = () => SYNC_ENABLED && Boolean(readAccount()) && readAccountStatus()?.approved !== false;
export const currentAccount = () => readAccount()?.user || null;

async function request(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(readAccount()), ...(options.headers || {}) } });
  if (!res.ok) {
    const err = new Error('file http ' + res.status);
    err.status = res.status;
    throw err;
  }
  return res;
}

// { [id]: { name, size, mime, addedAt, meta } }
export async function fetchRemoteIndex(kind) {
  return (await request(route(kind))).json();
}

// الملف يُرسل كما هو (لا base64)، فلا يُحمَّل في الذاكرة مرتين. meta يُخزَّن مع الملف على السيرفر.
// XMLHttpRequest لا fetch: وحده يُبلغ بتقدّم الرفع (onProgress بين 0 و1)، ويُلغى بـ signal.
export function uploadFile(kind, id, blob, { name, mime, meta } = {}, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', route(kind, id));
    const headers = {
      ...authHeaders(readAccount()),
      'Content-Type': mime || blob.type,
      ...(name ? { 'X-File-Name': encodeURIComponent(name) } : {}),
      ...(meta ? { 'X-File-Meta': encodeURIComponent(JSON.stringify(meta)) } : {}),
    };
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    if (onProgress) xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
        return;
      }
      const err = new Error('file http ' + xhr.status);
      err.status = xhr.status;
      reject(err);
    };
    xhr.onerror = () => reject(new Error('file network error'));
    xhr.onabort = () => reject(new DOMException('cancelled', 'AbortError'));
    if (signal) {
      if (signal.aborted) { xhr.abort(); return; }
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(blob);
  });
}

export async function deleteRemoteFile(kind, id) {
  await request(route(kind, id), { method: 'DELETE' });
}

// على الهاتف يُنزَّل مباشرة إلى path في مساحة التطبيق ويعود null؛ في المتصفح يعود Blob.
// تنزيل أندرويد يتجاهل recursive: بلا المجلّد يفشل كل تنزيل على هاتف لم يسجّل فيه شيء بعد.
// ويكتب الملف أثناء التنزيل: انقطاع الشبكة يترك مقطعاً ناقصاً يبدو موجوداً فلا يُعاد تنزيله، لذا .part ثم إعادة تسمية.
export async function downloadFile(kind, id, path) {
  if (Capacitor.isNativePlatform()) {
    const directory = Directory.Data;
    const part = `${path}.part`;
    const folder = path.split('/').slice(0, -1).join('/');
    if (folder) await Filesystem.mkdir({ path: folder, directory, recursive: true }).catch(() => {});   // موجود من قبل
    try {
      await Filesystem.downloadFile({ url: route(kind, id), headers: authHeaders(readAccount()), path: part, directory });
      await Filesystem.rename({ from: part, to: path, directory, toDirectory: directory });
    } catch (e) {
      await Filesystem.deleteFile({ path: part, directory }).catch(() => {});
      throw e;
    }
    return null;
  }
  return (await request(route(kind, id))).blob();
}
