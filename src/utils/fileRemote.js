import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { SYNC_URL, SYNC_ENABLED } from './syncConfig';
import { readAccount, authHeaders } from './syncAccount';

// ملفات الحساب على السيرفر (server/fileRoutes.js) بأنواعها: ijaza (PDF) و hifz (تسجيلات).
// بلا حساب لا شيء يُرفع.
const route = (kind, id = '') => `${SYNC_URL}/api/files/${kind}${id ? '/' + id : ''}`;

export const canReachServer = () => SYNC_ENABLED && Boolean(readAccount());
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
export async function uploadFile(kind, id, blob, { name, mime, meta } = {}) {
  const res = await request(route(kind, id), {
    method: 'PUT',
    headers: {
      'Content-Type': mime || blob.type,
      ...(name ? { 'X-File-Name': encodeURIComponent(name) } : {}),
      ...(meta ? { 'X-File-Meta': encodeURIComponent(JSON.stringify(meta)) } : {}),
    },
    body: blob,
  });
  return res.json();
}

export async function deleteRemoteFile(kind, id) {
  await request(route(kind, id), { method: 'DELETE' });
}

// على الهاتف يُنزَّل مباشرة إلى path في مساحة التطبيق ويعود null؛ في المتصفح يعود Blob
export async function downloadFile(kind, id, path) {
  if (Capacitor.isNativePlatform()) {
    await Filesystem.downloadFile({
      url: route(kind, id),
      headers: authHeaders(readAccount()),
      path,
      directory: Directory.Data,
      recursive: true,
    });
    return null;
  }
  return (await request(route(kind, id))).blob();
}
