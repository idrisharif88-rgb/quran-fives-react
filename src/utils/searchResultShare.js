import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { findMatchRanges } from './quranSearch.js';
import { loadVerseGlyphs } from './mushafVerse.js';
import { shareBlob } from './shareFile.js';

// مشاركة نتيجة بحث واحدة: نصّاً، أو PDF وصورة بخطّ مصحف المدينة

const toArabicDigits = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
const PAUSE_MARK = /^[ۖ-ۭ]+$/;   // علامات الوقف كلمات منفصلة في النص، وملتصقة بكلمتها في الخطّ

const resultRef = (result) => `سورة ${result.surahName} — آية ${toArabicDigits(result.a)}`;

// النصّ لا يحمل خطّاً: يظهر بخطّ التطبيق الذي يستقبله
export async function shareResultText(result) {
  const text = `﴿${result.t}﴾\n${resultRef(result)}`;

  if (Capacitor.isNativePlatform()) {
    await Share.share({ text }).catch(() => {});
    return;
  }
  if (navigator.share) {
    await navigator.share({ text }).catch(() => {});
    return;
  }
  await navigator.clipboard?.writeText(text).catch(() => {});
  alert('نُسخت الآية.');
}

// أرقام الكلمات التي يقع فيها البحث، بعدّ لا يشمل علامات الوقف
function matchedWords(text, query) {
  const ranges = findMatchRanges(text, query);
  const words = [];
  let pos = 0;
  for (const word of text.split(' ')) {
    const start = pos;
    pos += word.length + 1;
    if (!word || PAUSE_MARK.test(word)) continue;
    words.push(ranges.some((r) => r.start < start + word.length && r.end > start));
  }
  return words;
}

// البطاقة تُرسم على canvas مباشرة: html2canvas يركّب رموز خطّ المصحف بعضها فوق بعض
const CARD = {
  width: 1440,
  pad: 72,
  glyphSize: 76,
  lineHeight: 150,
  gap: 18,
  metaSize: 44,
  ink: '#1a1a1a',
  gold: '#c9a84c',
  mark: '#16a34a',
  meta: '#1b5e20',
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// توزيع الكلمات على أسطر من اليمين، كل سطر بعرض لا يتجاوز المتاح
function layoutLines(ctx, words, maxWidth) {
  const lines = [];
  let line = [];
  let width = 0;
  for (const word of words) {
    ctx.font = `${CARD.glyphSize}px '${word.family}'`;
    word.width = ctx.measureText(word.glyph).width;
    const next = width + (line.length ? CARD.gap : 0) + word.width;
    if (line.length && next > maxWidth) {
      lines.push({ words: line, width });
      line = [];
      width = 0;
    }
    width += (line.length ? CARD.gap : 0) + word.width;
    line.push(word);
  }
  if (line.length) lines.push({ words: line, width });
  return lines;
}

async function renderCard(result, query) {
  const glyphs = await loadVerseGlyphs(result.s, result.a);
  const hits = matchedWords(result.t, query);
  // التمييز بالكلمة لا يصحّ إلا إذا طابق عدد كلمات النصّ رموز الخطّ (عدا رقم الآية)
  const aligned = hits.length === glyphs.length - 1;
  await document.fonts?.load(`bold ${CARD.metaSize}px Tajawal`).catch(() => {});

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const words = glyphs.map((g, i) => ({ ...g, hit: aligned && hits[i] }));
  const lines = layoutLines(ctx, words, CARD.width - CARD.pad * 2);
  const verseBottom = CARD.pad + lines.length * CARD.lineHeight;
  canvas.width = CARD.width;
  canvas.height = verseBottom + CARD.metaSize * 2 + CARD.pad;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = CARD.gold;
  ctx.lineWidth = 6;
  roundRect(ctx, 3, 3, canvas.width - 6, canvas.height - 6, 40);
  ctx.stroke();

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, row) => {
    const baseline = CARD.pad + row * CARD.lineHeight + CARD.lineHeight * 0.62;
    let x = (CARD.width + line.width) / 2;   // سطر موسَّط، يُرسم من اليمين
    for (const word of line.words) {
      if (word.hit) {
        ctx.fillStyle = CARD.mark;
        roundRect(ctx, x - word.width - 6, baseline - CARD.glyphSize * 1.05, word.width + 12, CARD.glyphSize * 1.5, 12);
        ctx.fill();
      }
      ctx.font = `${CARD.glyphSize}px '${word.family}'`;
      ctx.fillStyle = word.hit ? '#ffffff' : CARD.ink;
      ctx.fillText(word.glyph, x, baseline);
      x -= word.width + CARD.gap;
    }
  });

  ctx.font = `bold ${CARD.metaSize}px Tajawal`;
  ctx.fillStyle = CARD.meta;
  ctx.fillText(resultRef(result), CARD.width - CARD.pad, verseBottom + CARD.metaSize * 1.2);
  return canvas;
}

const fileBase = (result) => `آية ${result.a} من سورة ${result.surahName}`;

export async function shareResultImage(result, query) {
  const canvas = await renderCard(result, query);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  await shareBlob(blob, `${fileBase(result)}.png`, 'آية من القرآن');
}

// صفحة A4 والبطاقة في أعلاها بعرض الصفحة
export async function shareResultPdf(result, query) {
  const canvas = await renderCard(result, query);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 15;
  const width = pdf.internal.pageSize.getWidth() - margin * 2;
  const height = (canvas.height / canvas.width) * width;
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, width, height);
  await shareBlob(pdf.output('blob'), `${fileBase(result)}.pdf`, 'آية من القرآن');
}
