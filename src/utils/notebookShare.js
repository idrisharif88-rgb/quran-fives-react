import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { shareBlob } from './shareFile.js';

// مشاركة ملاحظات «دفتر التحديثات»: نصّاً أو PDF، كلّها أو ما اختير منها

const TITLE = 'دفتر التحديثات';
const toArabicDigits = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
const dateText = (ts) => new Date(ts).toLocaleDateString('ar', { day: 'numeric', month: 'long', year: 'numeric' });

export function notesToText(notes) {
  const body = notes.map((n, i) => {
    const head = `${toArabicDigits(i + 1)}. ${n.done ? '✓ ' : ''}${n.title}`.trim();
    return n.text ? `${head}\n${n.text}` : head;
  });
  return `${TITLE}\n\n${body.join('\n\n')}`;
}

export async function shareNotesText(notes) {
  const text = notesToText(notes);
  if (Capacitor.isNativePlatform()) {
    await Share.share({ title: TITLE, text }).catch(() => {});
    return;
  }
  if (navigator.share) {
    await navigator.share({ title: TITLE, text }).catch(() => {});
    return;
  }
  await navigator.clipboard?.writeText(text).catch(() => {});
  alert('نُسخت الملاحظات.');
}

// ─── PDF: صفحات A4 تُرسم على canvas بخطّ التطبيق (العربية تتشكّل صحيحة) ───
const PAGE_W = 1240;
const PAGE_H = 1754;
const MARGIN = 90;
const TOP = 120;
const BOTTOM = PAGE_H - 110;
const WIDTH = PAGE_W - MARGIN * 2;

const FONTS = {
  head: 'bold 46px Tajawal',
  title: 'bold 32px Tajawal',
  text: '27px Tajawal',
  small: '22px Tajawal',
};
const LINE_H = { title: 52, text: 46 };
const NOTE_GAP = 34;
const INK = '#1a1a1a';
const MUTED = '#6b7280';
const ACCENT = '#1f5f3f';

async function preloadFonts() {
  if (!document.fonts) return;
  try {
    await Promise.all(Object.values(FONTS).map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  } catch {
    // ارسم بما تيسّر
  }
}

// يلفّ فقرة إلى أسطر بعرض الصفحة؛ الكلمة الأطول من السطر تُقطع حروفاً
function wrap(ctx, paragraph) {
  const lines = [];
  let line = '';
  for (const word of paragraph.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= WIDTH) { line = candidate; continue; }
    if (line) lines.push(line);
    line = word;
    while (ctx.measureText(line).width > WIDTH) {
      let cut = line.length - 1;
      while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > WIDTH) cut -= 1;
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
    }
  }
  lines.push(line);
  return lines;
}

// كل ملاحظة ← أسطر مرسومة { kind, text, done }، ثم فاصل بعدها
function layoutNotes(ctx, notes) {
  const rows = [];
  notes.forEach((n, i) => {
    ctx.font = FONTS.title;
    const head = `${toArabicDigits(i + 1)}. ${n.done ? '✓ ' : ''}${n.title}`.trim();
    wrap(ctx, head).forEach((text) => rows.push({ kind: 'title', text, done: n.done }));
    ctx.font = FONTS.text;
    n.text.split('\n').forEach((p) => wrap(ctx, p).forEach((text) => rows.push({ kind: 'text', text, done: n.done })));
    rows.push({ kind: 'gap' });
  });
  return rows;
}

const rowHeight = (row) => (row.kind === 'gap' ? NOTE_GAP : LINE_H[row.kind]);

function paginate(rows) {
  const firstTop = TOP + 110;   // تحت عنوان الصفحة الأولى
  const pages = [[]];
  let y = firstTop;
  rows.forEach((row) => {
    if (y + rowHeight(row) > BOTTOM && row.kind !== 'gap') {
      pages.push([]);
      y = TOP;
    }
    pages[pages.length - 1].push(row);
    y += rowHeight(row);
  });
  return pages;
}

function drawPage(rows, pageNo, pageCount) {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.direction = 'rtl';

  let y = TOP;
  if (pageNo === 1) {
    ctx.textAlign = 'center';
    ctx.fillStyle = ACCENT;
    ctx.font = FONTS.head;
    ctx.fillText(TITLE, PAGE_W / 2, y + 30);
    ctx.fillStyle = MUTED;
    ctx.font = FONTS.small;
    ctx.fillText(dateText(Date.now()), PAGE_W / 2, y + 74);
    y += 110;
  }

  ctx.textAlign = 'right';
  rows.forEach((row) => {
    if (row.kind !== 'gap') {
      ctx.font = FONTS[row.kind];
      ctx.fillStyle = row.done ? MUTED : (row.kind === 'title' ? ACCENT : INK);
      ctx.fillText(row.text, PAGE_W - MARGIN, y + LINE_H[row.kind] - 14);
    }
    y += rowHeight(row);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#999999';
  ctx.font = FONTS.small;
  ctx.fillText(`صفحة ${toArabicDigits(pageNo)} من ${toArabicDigits(pageCount)}`, PAGE_W / 2, PAGE_H - 50);
  return canvas;
}

export async function shareNotesPdf(notes) {
  await preloadFonts();
  const measure = document.createElement('canvas').getContext('2d');
  const pages = paginate(layoutNotes(measure, notes));

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pages.forEach((rows, i) => {
    if (i > 0) pdf.addPage();
    const canvas = drawPage(rows, i + 1, pages.length);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });
  await shareBlob(pdf.output('blob'), `${TITLE}.pdf`, TITLE);
}
