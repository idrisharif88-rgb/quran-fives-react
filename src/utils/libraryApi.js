import { SYNC_URL, SYNC_ENABLED } from './syncConfig';
import { readAccount, authHeaders } from './syncAccount';

// المكتبة على السيرفر (server/libraryRoutes.js). الطلبات بحساب المستخدم كالمزامنة.
// الخطأ يحمل kind ليعرض الشاشة المناسبة: offline | signin | pending | unavailable | error
export const LIBRARY_ENABLED = SYNC_ENABLED;

const KIND_BY_STATUS = { 401: 'signin', 403: 'pending', 503: 'unavailable' };

async function get(path, signal) {
  let res;
  try {
    res = await fetch(`${SYNC_URL}/api/library/${path}`, { headers: authHeaders(readAccount()), signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw Object.assign(new Error('library offline'), { kind: 'offline' });
  }
  if (!res.ok) throw Object.assign(new Error('library http ' + res.status), { kind: KIND_BY_STATUS[res.status] || 'error' });
  return res.json();
}

export const fetchLibraryBooks = (signal) => get('books', signal).then((r) => r.books);

export const searchLibrary = (q, { bookId, offset = 0, limit = 20 } = {}, signal) => {
  const params = new URLSearchParams({ q, offset: String(offset), limit: String(limit) });
  if (bookId) params.set('book', String(bookId));
  return get(`search?${params}`, signal).then((r) => r.results);
};

export const fetchLibraryPassage = (id, signal) => get(`passage/${id}`, signal);
