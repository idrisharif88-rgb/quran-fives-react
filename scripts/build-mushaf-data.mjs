// يبني بيانات صفحات المصحف ويحفظها مع خطوطه محلياً كي يعمل المصحف بلا إنترنت.
// الطبعة: مصحف المدينة النبوية — مجمّع الملك فهد، الطبعة القديمة (1405هـ)، 604 صفحات
// و15 سطراً. لكل صفحة خطّها الخاص (QCF V1) الذي يرسم كلماتها كما في المطبوع تماماً،
// والكلمة رمز (أو رمزان) في ذلك الخط؛ المسافة في البيانات فاصل بين الكلمات لا حرف يُرسم.
//
//   node scripts/build-mushaf-data.mjs [cacheDir]
//
// cacheDir (اختياري): مجلّد يحفظ ردود الخادم والخطوط فلا يُعاد تنزيلها عند كل تشغيل.
//
// صيغة السطر في الملفات الناتجة:
//   { "k": "t", "v": [[سورة, آية, "رموز كلمات الآية على هذا السطر"], ...] }   سطر نصّ
//   { "k": "s", "s": رقم_السورة }                                             عنوان سورة
//   { "k": "b" }                                                              بسملة
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const EDITION = 'madinah-1405';
const TOTAL_PAGES = 604;
const PAGES_PER_CHUNK = 50;
const MUSHAF_ID = 2; // QCF V1 = طبعة 1405هـ
const API = 'https://api.quran.com/api/v4/verses/by_page';
const FONT_URL = (page) => `https://raw.githubusercontent.com/quran/quran.com-frontend-next/master/public/fonts/quran/hafs/v1/woff2/p${page}.woff2`;

const root = process.cwd();
const outDir = path.join(root, 'src', 'data', 'mushaf', EDITION);
const fontDir = path.join(root, 'public', 'mushaf', EDITION);
const cacheDir = process.argv[2] ? path.resolve(process.argv[2]) : null;

async function fetchJson(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`http ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 4) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

// كل آيات الصفحة بكلماتها وأرقام أسطرها
async function fetchPageVerses(page) {
  const cacheFile = cacheDir && path.join(cacheDir, `${EDITION}-page-${page}.json`);
  if (cacheFile) {
    try { return JSON.parse(await readFile(cacheFile, 'utf8')); } catch { /* غير مخزّنة بعد */ }
  }
  const verses = [];
  for (let apiPage = 1; apiPage != null; ) {
    const url = `${API}/${page}?words=true&per_page=50&page=${apiPage}&mushaf=${MUSHAF_ID}`
      + '&word_fields=code_v1,line_number&fields=verse_key';
    const json = await fetchJson(url);
    for (const v of json.verses) {
      const [s, a] = v.verse_key.split(':').map(Number);
      verses.push({ s, a, words: v.words.map((w) => [w.code_v1, w.line_number]) });
    }
    apiPage = json.pagination?.next_page ?? null;
  }
  if (cacheFile) await writeFile(cacheFile, JSON.stringify(verses));
  return verses;
}

// أسطر النصّ في الصفحة: رقم السطر ← مقاطع [سورة، آية، رموز الكلمات مفصولة بمسافة]
function textLinesOf(verses) {
  const lines = new Map();
  for (const { s, a, words } of verses) {
    for (const [text, lineNumber] of words) {
      if (!lines.has(lineNumber)) lines.set(lineNumber, []);
      const segments = lines.get(lineNumber);
      const last = segments[segments.length - 1];
      if (last && last[0] === s && last[1] === a) last[2] += ' ' + text;
      else segments.push([s, a, text]);
    }
  }
  return lines;
}

async function main() {
  if (cacheDir) await mkdir(cacheDir, { recursive: true });

  // 1) التنزيل — أربع صفحات معاً
  const pageVerses = new Array(TOTAL_PAGES);
  let next = 1;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next <= TOTAL_PAGES) {
      const page = next++;
      pageVerses[page - 1] = await fetchPageVerses(page);
      if (page % 50 === 0) console.log(`fetched ${page}/${TOTAL_PAGES}`);
    }
  }));

  // 2) أسطر النصّ، وعدد أسطر كل صفحة (15، إلا الصفحتين الأوليين)
  const pages = pageVerses.map((verses, p) => {
    const text = textLinesOf(verses);
    const lastTextLine = Math.max(...text.keys());
    const lineCount = p < 2 ? lastTextLine : 15;
    const lines = Array.from({ length: lineCount }, (_, i) => (text.has(i + 1) ? { k: 't', v: text.get(i + 1) } : null));
    return { lines, verses };
  });

  // 3) الأسطر الفارغة عناوين سور وبسملات: قبل أول آية من كل سورة مباشرةً
  //    (بسملة ثم عنوان فوقها — بلا بسملة للفاتحة والتوبة). قد يقع العنوان في آخر الصفحة السابقة.
  const surahPages = new Array(114).fill(0);
  for (let p = 0; p < TOTAL_PAGES; p++) {
    for (const verse of pages[p].verses) {
      if (verse.a !== 1) continue;
      surahPages[verse.s - 1] = p + 1;
      const needed = verse.s === 1 || verse.s === 9 ? [{ k: 's', s: verse.s }] : [{ k: 'b' }, { k: 's', s: verse.s }];
      let page = p;
      let line = verse.words[0][1] - 2; // فهرس السطر السابق لأول كلمة
      for (const item of needed) {
        if (line < 0) { page -= 1; line = pages[page].lines.length - 1; }
        if (pages[page].lines[line] !== null) throw new Error(`no empty line for surah ${verse.s} (page ${page + 1})`);
        pages[page].lines[line] = item;
        line -= 1;
      }
    }
  }

  // 4) تحقّق: لا سطر بلا محتوى، وكل السور وُجدت، وعدد الآيات صحيح
  let verseCount = 0;
  pages.forEach(({ lines, verses }, p) => {
    lines.forEach((l, i) => { if (!l) throw new Error(`empty line ${i + 1} on page ${p + 1}`); });
    verseCount += verses.length;
  });
  if (surahPages.includes(0)) throw new Error('surah without a start page');
  if (verseCount !== 6236) throw new Error(`expected 6236 verses, got ${verseCount}`);

  // 5) الكتابة: ملف لكل 50 صفحة + فهرس
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  for (let start = 0; start < TOTAL_PAGES; start += PAGES_PER_CHUNK) {
    const chunk = pages.slice(start, start + PAGES_PER_CHUNK).map((pg) => pg.lines);
    const name = `pages-${String(start / PAGES_PER_CHUNK).padStart(2, '0')}.json`;
    await writeFile(path.join(outDir, name), JSON.stringify(chunk));
  }
  await writeFile(
    path.join(outDir, 'index.json'),
    JSON.stringify({ edition: EDITION, totalPages: TOTAL_PAGES, pagesPerChunk: PAGES_PER_CHUNK, surahPages }),
  );

  // 6) خطّ كل صفحة
  await mkdir(fontDir, { recursive: true });
  let fontBytes = 0;
  let nextFont = 1;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (nextFont <= TOTAL_PAGES) {
      const page = nextFont++;
      const cacheFile = cacheDir && path.join(cacheDir, `${EDITION}-p${page}.woff2`);
      let data = null;
      if (cacheFile) { try { data = await readFile(cacheFile); } catch { /* غير مخزّن بعد */ } }
      if (!data) {
        for (let attempt = 1; !data; attempt++) {
          try {
            const res = await fetch(FONT_URL(page));
            if (!res.ok) throw new Error(`http ${res.status}`);
            data = Buffer.from(await res.arrayBuffer());
          } catch (err) {
            if (attempt >= 4) throw new Error(`font p${page}: ${err.message}`);
            await new Promise((r) => setTimeout(r, 800 * attempt));
          }
        }
        if (cacheFile) await writeFile(cacheFile, data);
      }
      await writeFile(path.join(fontDir, `p${page}.woff2`), data);
      fontBytes += data.length;
    }
  }));
  console.log(`fonts: ${(fontBytes / 1048576).toFixed(1)} MB`);

  console.log(`done: ${TOTAL_PAGES} pages, ${verseCount} verses → ${path.relative(root, outDir)}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
