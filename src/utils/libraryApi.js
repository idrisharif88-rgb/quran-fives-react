import { SYNC_URL, SYNC_ENABLED } from './syncConfig';
import { readAccount, authHeaders } from './syncAccount';

// المكتبة على السيرفر (server/libraryRoutes.js). الطلبات بحساب المستخدم كالمزامنة.
// الخطأ يحمل kind ليعرض الشاشة المناسبة: offline | signin | pending | locked | unavailable | error
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
  if (!res.ok) {
    // 403 برمز library-off: الحساب موافَق عليه لكن المكتبة لم تُفتح له
    const body = res.status === 403 ? await res.json().catch(() => ({})) : {};
    const kind = body.code === 'library-off' ? 'locked' : KIND_BY_STATUS[res.status] || 'error';
    throw Object.assign(new Error('library http ' + res.status), { kind });
  }
  return res.json();
}

// كلمة البحث والكتب المختارة وطريقة البحث → معاملات الطلب
const queryOf = (q, { bookIds = [], exact = false, order = 'rank' } = {}, extra = {}) => {
  const params = new URLSearchParams({ q, ...extra });
  if (bookIds.length) params.set('books', bookIds.join(','));
  if (exact) params.set('exact', '1');
  if (order === 'book') params.set('order', 'book');
  return params;
};

// { books: [{ id, name, by, section, vols, passages }], sections: [{ id, name }] }
export const fetchLibraryBooks = (signal) => get('books', signal);

export const searchLibrary = (q, opts = {}, signal) => {
  const { offset = 0, limit = 20 } = opts;
  return get(`search?${queryOf(q, opts, { offset: String(offset), limit: String(limit) })}`, signal).then((r) => r.results);
};

// { groups: [{ bookId, book, count, hits }], counts: { [bookId]: n } }
export const fetchLibraryGrouped = (q, opts = {}, signal) => get(`grouped?${queryOf(q, opts)}`, signal);

export const fetchLibraryPassage = (id, signal) => get(`passage/${id}`, signal);
