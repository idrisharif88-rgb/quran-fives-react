import index from '../data/mushaf/madinah-1405/index.json';
import { chunkLocation } from './mushafLayout';

// الطبعة المعروضة: مصحف المدينة النبوية — مجمّع الملك فهد، الطبعة القديمة (1405هـ).
// كل ما يخصّ الطبعة محصور هنا: إضافة طبعة أخرى تعني ملف بيانات آخر ووصفاً مثله،
// ولا تغيير في مكوّنات العرض.
// البيانات والخطوط يولّدها scripts/build-mushaf-data.mjs.
const chunkLoaders = import.meta.glob('../data/mushaf/madinah-1405/pages-*.json', { import: 'default' });

export const MUSHAF = {
  id: index.edition,
  totalPages: index.totalPages,
  linesPerPage: 15,
  surahPages: index.surahPages,
  // البسملة تُرسم بكلمات الآية الأولى من الفاتحة (بلا رقمها) من خط الصفحة الأولى
  basmala: { page: 1, glyphs: ['ﭑ', 'ﭒ', 'ﭓ', 'ﭔ'] },
};

const fontFamily = (page) => `mushaf-${MUSHAF.id}-p${page}`;
// base في vite.config هو './' فالمسار نسبيّ يعمل داخل APK وعلى الويب
const fontUrl = (page) => `./mushaf/${MUSHAF.id}/p${page}.woff2`;

const chunkCache = new Map();
const fontCache = new Map();

function loadChunk(chunk) {
  if (!chunkCache.has(chunk)) {
    const key = Object.keys(chunkLoaders).find((k) => k.endsWith(`pages-${String(chunk).padStart(2, '0')}.json`));
    if (!key) return Promise.reject(new Error(`mushaf chunk ${chunk} missing`));
    chunkCache.set(chunk, chunkLoaders[key]());
  }
  return chunkCache.get(chunk);
}

// خطّ الصفحة: يُحمَّل مرة واحدة ويُسجَّل باسم خاص بها
function loadFont(page) {
  if (!fontCache.has(page)) {
    const family = fontFamily(page);
    const face = new FontFace(family, `url(${fontUrl(page)}) format('woff2')`);
    const ready = face.load().then((loaded) => {
      document.fonts.add(loaded);
      return family;
    });
    ready.catch(() => fontCache.delete(page)); // يُعاد المحاولة عند الطلب التالي
    fontCache.set(page, ready);
  }
  return fontCache.get(page);
}

// أسطر الصفحة وخطّها (وخطّ البسملة إن كان فيها بسملة)
export async function loadMushafPage(page) {
  const { chunk, offset } = chunkLocation(page, index.pagesPerChunk);
  const lines = (await loadChunk(chunk))[offset];
  const hasBasmala = lines.some((l) => l.k === 'b');
  const [family, basmalaFamily] = await Promise.all([
    loadFont(page),
    hasBasmala ? loadFont(MUSHAF.basmala.page) : null,
  ]);
  return { page, lines, family, basmalaFamily };
}
