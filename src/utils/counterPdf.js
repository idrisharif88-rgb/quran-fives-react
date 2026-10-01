import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { formatTotal, formatLap } from '../hooks/useStopwatch';

// أرقام عربية مشرقيّة
const toArabicDigits = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

// أبعاد A4 بدقّة ~150dpi (مثل تقرير البحث)
const PAGE_W = 1240;
const PAGE_H = 1754;
const MARGIN = 80;
const CONTENT_TOP = 300;
const CONTENT_BOTTOM = PAGE_H - 120;

const GOLD = '#c9a84c';
const INK = '#1a1a1a';
const MUTED = '#6b7280';
const CARD_BORDER = '#e1e4e8';

const TITLE_FONT = 'bold 46px Tajawal';
const ROW_FONT = '28px Tajawal';
const SMALL_FONT = '22px Tajawal';
const ROW_H = 66;
const MAX_ROWS_PER_PAGE = Math.floor((CONTENT_BOTTOM - CONTENT_TOP) / ROW_H);

// تحميل الخطوط المحلية قبل الرسم (نفس خطوط التطبيق)
export async function preloadCounterPdfFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(TITLE_FONT),
      document.fonts.load(ROW_FONT),
      document.fonts.load(SMALL_FONT),
    ]);
    await document.fonts.ready;
  } catch {
    // تجاهل أخطاء الخطوط وارسم بما تيسّر
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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

// رسم رأس الصفحة (العنوان + الإجمالي)
function drawHeader(ctx, totalMs) {
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = TITLE_FONT;
  ctx.fillText('تقرير العداد', PAGE_W / 2, 150);

  ctx.fillStyle = INK;
  ctx.font = ROW_FONT;
  ctx.fillText(`الإجمالي: ${formatTotal(totalMs)}`, PAGE_W / 2, 225);
}

// رسم صف صفحة داخل بطاقة بيضاء بحوافّ دائرية
function drawRowCard(ctx, y, label, value) {
  const x = MARGIN;
  const w = PAGE_W - MARGIN * 2;
  const h = ROW_H - 12;
  const r = 14;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = CARD_BORDER;
  ctx.lineWidth = 2;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.stroke();

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = ROW_FONT;
  ctx.fillText(label, x + w - 20, y + h - 20);

  ctx.textAlign = 'left';
  ctx.fillStyle = MUTED;
  ctx.fillText(value, x + 20, y + h - 20);
}

function drawPageCanvas(totalMs, rows, pageNo, totalPages) {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  drawHeader(ctx, totalMs);

  let y = CONTENT_TOP;
  rows.forEach((r) => {
    drawRowCard(ctx, y, r.label, r.value);
    y += ROW_H;
  });

  // تذييل: رقم الصفحة
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#999999';
  ctx.font = SMALL_FONT;
  ctx.fillText(`صفحة ${toArabicDigits(pageNo)} من ${toArabicDigits(totalPages)}`, PAGE_W / 2, PAGE_H - 40);

  return canvas;
}

// بناء صفوف التقرير من الجولات (الصفحات) والأجزاء المكتملة
function buildRows(laps, juzTimes) {
  const rows = [];
  laps.forEach((l) => {
    rows.push({ label: `صفحة ${l.page}`, value: formatLap(l.ms) });
  });
  juzTimes.forEach((j) => {
    rows.push({ label: `الجزء ${j.juz}`, value: formatTotal(j.ms) });
  });
  return rows;
}

function paginateRows(rows) {
  if (!rows.length) return [[]];
  const pages = [];
  for (let i = 0; i < rows.length; i += MAX_ROWS_PER_PAGE) {
    pages.push(rows.slice(i, i + MAX_ROWS_PER_PAGE));
  }
  return pages;
}

function buildPdfFileName() {
  return 'تقرير العداد.pdf';
}

/**
 * إنشاء PDF لتقرير جلسة العداد (صفحات + أجزاء + إجمالي) ومشاركته.
 * على أندرويد (Capacitor) يفتح ورقة المشاركة عبر Filesystem + Share،
 * وعلى المتصفح يستخدم Web Share API مع تنزيل الملف كاحتياط.
 */
export async function shareCounterResultsPdf({ laps = [], juzTimes = [], totalMs = 0 } = {}) {
  await preloadCounterPdfFonts();

  const rows = buildRows(laps, juzTimes);
  const pages = paginateRows(rows);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pages.forEach((pageRows, i) => {
    if (i > 0) pdf.addPage();
    const canvas = drawPageCanvas(totalMs, pageRows, i + 1, pages.length);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });

  const blob = pdf.output('blob');
  const fileName = buildPdfFileName();
  const title = 'تقرير العداد';

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
