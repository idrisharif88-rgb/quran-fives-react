import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { SYNC_URL, SYNC_ENABLED } from './syncConfig';
import { readAccount, authHeaders } from './syncAccount';

// ملف الإجازة على السيرفر، لكل حساب (server/fileRoutes.js). بلا حساب لا شيء يُرفع.
const route = (id = '') => `${SYNC_URL}/api/files/ijaza${id ? '/' + id : ''}`;

export const canReachServer = () => SYNC_ENABLED && Boolean(readAccount());

async function request(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(readAccount()), ...(options.headers || {}) } });
  if (!res.ok) {
    const err = new Error('ijaza file http ' + res.status);
    err.status = res.status;
    throw err;
  }
  return res;
}

// { [id]: { name, size, addedAt } }
export async function fetchRemoteIndex() {
  return (await request(route())).json();
}

// الملف يُرسل كما هو (لا base64)، فلا يُحمَّل في الذاكرة مرتين
export async function uploadFile(id, blob, name) {
  const res = await request(route(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(name) },
    body: blob,
  });
  return res.json();
}

export async function deleteRemoteFile(id) {
  await request(route(id), { method: 'DELETE' });
}

// على الهاتف يُنزَّل مباشرة إلى path في مساحة التطبيق؛ في المتصفح يعود Blob
export async function downloadFile(id, path) {
  if (Capacitor.isNativePlatform()) {
    await Filesystem.downloadFile({
      url: route(id),
      headers: authHeaders(readAccount()),
      path,
      directory: Directory.Data,
      recursive: true,
    });
    return null;
  }
  return (await request(route(id))).blob();
}
