// مسوّدة تسجيل المراجعة: أجزاء التسجيل تُكتب في IndexedDB أثناء التسجيل (كل ثانية)،
// فإن أُغلق التطبيق أو قُتل قبل الإيقاف استُعيد التسجيل عند الفتح التالي.
// { meta } واحد + أجزاء بالترتيب. لا تُزامَن ولا تُمسح مع بيانات الحساب: تصير تسجيلاً عادياً عند استعادتها.

const DB_NAME = 'quran-fives-recording-draft';
const CHUNKS = 'chunks';
const META = 'meta';

let dbPromise = null;
function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no indexedDB'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(CHUNKS, { autoIncrement: true });
        req.result.createObjectStore(META);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

// معاملة واحدة على المخزنين؛ تنتهي حين تُكتب فعلاً
async function run(work) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([CHUNKS, META], 'readwrite');
    let result;
    work(tx.objectStore(CHUNKS), tx.objectStore(META), (value) => { result = value; });
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const ignore = () => {};

export const startDraft = (meta) => run((chunks, metaStore) => {
  chunks.clear();
  metaStore.put({ ...meta, updatedAt: Date.now() }, 'meta');
}).catch(ignore);

// جزء جديد من التسجيل، ومعه آخر ما يُعرف عنه (صفحة الإيقاف الحالية، الزمن)
export const appendDraft = (chunk, patch) => run((chunks, metaStore) => {
  chunks.add(chunk);
  const req = metaStore.get('meta');
  req.onsuccess = () => {
    if (req.result) metaStore.put({ ...req.result, ...patch, updatedAt: Date.now() }, 'meta');
  };
}).catch(ignore);

export const clearDraft = () => run((chunks, metaStore) => {
  chunks.clear();
  metaStore.clear();
}).catch(ignore);

// حفظ جارٍ في هذه الجلسة لتسجيل قُطع (مغادرة الشاشة): الاستعادة تنتظره كي لا يُحفظ التسجيل مرّتين
let pending = Promise.resolve();
export function holdDraft(promise) {
  pending = pending.then(() => promise).catch(ignore);
}

// يعيد { blob, meta } لتسجيل لم يُحفظ ويمسح المسوّدة، أو null
export async function takeDraft() {
  await pending;
  try {
    const found = await run((chunks, metaStore, done) => {
      const metaReq = metaStore.get('meta');
      const chunksReq = chunks.getAll();
      chunksReq.onsuccess = () => {
        done({ meta: metaReq.result, parts: chunksReq.result });
        chunks.clear();
        metaStore.clear();
      };
    });
    if (!found?.meta || !found.parts.length) return null;
    const blob = new Blob(found.parts, { type: found.meta.mimeType || 'audio/webm' });
    return blob.size > 0 ? { blob, meta: found.meta } : null;
  } catch {
    return null;
  }
}
