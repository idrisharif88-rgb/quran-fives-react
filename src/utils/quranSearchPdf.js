import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { findMatchRanges } from './quranSearch.js';

// أرقام عربية مشرقيّة
const toArabicDigits = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

// أبعاد A4 بدقّة ~150dpi
const PAGE_W = 1240;
const PAGE_H = 1754;
const MARGIN = 80;

const GOLD = '#c9a84c';
const INK = '#1a1a1a';
const HIGHLIGHT_BG = '#16a34a';

const VERSE_FONT = '42px Amiri';
const VERSE_FONT_PX = 42;
const VERSE_LINE_H = 62;
const HIGHLIGHT_PAD_X = 3;
const HIGHLIGHT_PAD_Y = 2;
const META_FONT = 'bold 26px Tajawal';
const META_H = 40;
const BLOCK_GAP = 36;

const CONTENT_TOP = 320;
const CONTENT_BOTTOM = PAGE_H - 130;

// تحميل الخطوط المحلية قبل الرسم (نفس خطوط التطبيق)
export async function preloadSearchPdfFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('42px Amiri'),
      document.fonts.load('bold 26px Tajawal'),
      document.fonts.load('bold 46px Tajawal'),
      document.fonts.load('22px Tajawal'),
    ]);
    await document.fonts.ready;
  } catch {
    // تجاهل أخطاء الخطوط وارسم بما تيسّر
  }
}

// لفّ النص العربي إلى أسطر مع مواضع كل سطر في النصّ الأصلي (لأجل التمييز)
function wrapTextWithRanges(ctx, text, maxWidth) {
  const words = text.split(' ');
  const wordStarts = [];
  let idx = 0;
  for (const w of words) {
    wordStarts.push(idx);
    idx += w.length + 1;
  }

  const lines = [];
  let lineText = '';
  let lineWords = [];

  for (let i = 0; i < words.length; i++) {
    const candidate = lineText ? `${lineText} ${words[i]}` : words[i];
    if (ctx.measureText(candidate).width > maxWidth && lineWords.length) {
      const start = wordStarts[lineWords[0]];
      const end = wordStarts[lineWords[lineWords.length - 1]] + words[lineWords[lineWords.length - 1]].length;
      lines.push({ text: lineText, start, end });
      lineText = words[i];
      lineWords = [i];
    } else {
      lineText = candidate;
      lineWords.push(i);
    }
  }

  if (lineWords.length) {
    const start = wordStarts[lineWords[0]];
    const end = wordStarts[lineWords[lineWords.length - 1]] + words[lineWords[lineWords.length - 1]].length;
    lines.push({ text: lineText, start, end });
  }

  return lines;
}

// مسار مستطيل بزوايا دائرية
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// يقسّم سطراً إلى مقاطع مميّزة/عادية وفق نطاقات التطابق
function segmentsForLine(lineText, lineStart, ranges) {
  const segments = [];
  let pos = 0;
  for (const r of ranges) {
    const ls = r.start - lineStart;
    const le = r.end - lineStart;
    if (le <= 0 || ls >= lineText.length) continue;
    const s = Math.max(ls, 0);
    const e = Math.min(le, lineText.length);
    if (e <= s) continue;
    if (s > pos) segments.push({ text: lineText.slice(pos, s), highlighted: false });
    segments.push({ text: lineText.slice(s, e), highlighted: true });
    pos = e;
  }
  if (pos < lineText.length) segments.push({ text: lineText.slice(pos), highlighted: false });
  return segments.length ? segments : [{ text: lineText, highlighted: false }];
}

// يرسم سطراً من اليمين إلى اليسار مع تمييز المقاطع المطابقة
function drawTextLine(ctx, segments, x, y, baseColor) {
  ctx.textAlign = 'right';
  let cursor = x;
  for (const seg of segments) {
    const w = ctx.measureText(seg.text).width;
    if (seg.highlighted) {
      ctx.fillStyle = HIGHLIGHT_BG;
      roundRectPath(ctx, cursor - w - HIGHLIGHT_PAD_X, y - HIGHLIGHT_PAD_Y, w + HIGHLIGHT_PAD_X * 2, VERSE_FONT_PX + HIGHLIGHT_PAD_Y * 2, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = baseColor;
    }
    ctx.fillText(seg.text, cursor, y);
    cursor -= w;
  }
}

// قياس كتلة نتيجة واحدة (نصّ الآية + سطر السورة/الآية)
function measureBlock(ctx, result, query) {
  const verseLines = wrapTextWithRanges(ctx, result.t, PAGE_W - MARGIN * 2);
  const meta = `سورة ${result.surahName} — آية ${toArabicDigits(result.a)}`;
  const height = verseLines.length * VERSE_LINE_H + META_H + BLOCK_GAP;
  const ranges = findMatchRanges(result.t, query);
  return { result, verseLines, meta, height, ranges };
}

// تقسيم النتائج إلى صفحات بحسب المساحة المتاحة
function paginate(blocks) {
  const pages = [];
  let current = [];
  let y = CONTENT_TOP;

  for (const block of blocks) {
    if (current.length && y + block.height > CONTENT_BOTTOM) {
      pages.push(current);
      current = [];
      y = CONTENT_TOP;
    }
    current.push(block);
    y += block.height;
  }

  if (current.length) pages.push(current);
  return pages;
}

// رسم صفحة واحدة على Canvas
function drawPageCanvas(blocks, query, count, pageNo, totalPages) {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  ctx.direction = 'rtl';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 0, PAGE_W, 14);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#2f2f2f';
  ctx.font = 'bold 46px Tajawal';
  ctx.fillText('نتائج البحث في القرآن', PAGE_W / 2, 84);

  ctx.font = 'bold 30px Tajawal';
  const queryLabel = `« ${query} »`;
  const qw = ctx.measureText(queryLabel).width;
  ctx.fillStyle = HIGHLIGHT_BG;
  roundRectPath(ctx, (PAGE_W - qw) / 2 - 10, 142, qw + 20, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(queryLabel, PAGE_W / 2, 146);

  ctx.fillStyle = '#666666';
  ctx.font = '26px Tajawal';
  ctx.fillText(`عدد النتائج: ${toArabicDigits(count)}`, PAGE_W / 2, 200);

  ctx.strokeStyle = 'rgba(201,168,76,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN, 238);
  ctx.lineTo(PAGE_W - MARGIN, 238);
  ctx.stroke();

  let y = CONTENT_TOP;
  for (const block of blocks) {
    // إعادة ضبط خطّ الآية في كلّ كتلة — سطر السورة يغيّره إلى Tajawal
    ctx.font = VERSE_FONT;
    ctx.fillStyle = INK;
    for (const line of block.verseLines) {
      const segments = segmentsForLine(line.text, line.start, block.ranges);
      drawTextLine(ctx, segments, PAGE_W - MARGIN, y, INK);
      y += VERSE_LINE_H;
    }
    ctx.fillStyle = GOLD;
    ctx.font = META_FONT;
    ctx.fillText(block.meta, PAGE_W - MARGIN, y);
    y += META_H + BLOCK_GAP;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(201,168,76,0.4)';
  ctx.font = '22px Tajawal';
  ctx.fillText('خماسيات', PAGE_W / 2, PAGE_H - 70);
  ctx.fillStyle = '#999999';
  ctx.font = '20px Tajawal';
  ctx.fillText(`صفحة ${toArabicDigits(pageNo)} من ${toArabicDigits(totalPages)}`, PAGE_W / 2, PAGE_H - 40);

  ctx.fillStyle = GOLD;
  ctx.fillRect(0, PAGE_H - 12, PAGE_W, 12);

  return canvas;
}

// إنشاء ملف PDF من النتائج
function buildSearchPdf(results, query) {
  const measure = document.createElement('canvas').getContext('2d');
  measure.direction = 'rtl';
  measure.font = VERSE_FONT;

  const blocks = results.map((result) => measureBlock(measure, result, query));
  const pages = paginate(blocks);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  pages.forEach((pageBlocks, i) => {
    if (i > 0) pdf.addPage();
    const canvas = drawPageCanvas(pageBlocks, query, results.length, i + 1, pages.length);
    // JPEG بدل PNG: النصّ على خلفية بيضاء يُضغط بحجم أصغر بكثير (PNG بلا فقدان يضخّم الملف)
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });

  return pdf.output('blob');
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// اسم وصفيّ للملف يعتمد على الكلمة المبحوث عنها
function buildPdfFileName(query) {
  const q = String(query || '').trim().replace(/\s+/g, ' ');
  return q ? `نتائج البحث عن ${q} في القرآن.pdf` : 'نتائج البحث في القرآن.pdf';
}

/**
 * إنشاء PDF لنتائج البحث ومشاركته.
 * على أندرويد/iOS يفتح ورقة المشاركة (واتساب، تيليجرام…) عبر Capacitor،
 * وعلى المتصفح يستخدم Web Share API مع تنزيل الملف كاحتياط.
 *
 * @param {{ s: number, a: number, t: string, surahName: string }[]} results
 * @param {string} query الكلمة المبحوث عنها
 */
export async function shareSearchResultsPdf(results, query) {
  if (!results?.length) return;

  await preloadSearchPdfFonts();
  const blob = buildSearchPdf(results, query);
  const fileName = buildPdfFileName(query);
  const title = 'نتائج البحث في القرآن';

  // أندرويد / iOS: نجهّز الملف ثم نفتح ورقة المشاركة فوراً (لا ننتظر إغلاقها)
  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(blob);
    await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    Share.share({ title, files: [uri] })
      .catch((e) => {
        if (e?.message !== 'Share canceled') alert('تعذّر المشاركة: ' + (e?.message || ''));
      })
      .finally(() => Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {}));
    return;
  }

  // متصفح الويب
  const file = new File([blob], fileName, { type: 'application/pdf' });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    navigator.share({ files: [file], title }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

