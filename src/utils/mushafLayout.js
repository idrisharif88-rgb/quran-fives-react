// حسابات المصحف الصرفة (بلا DOM ولا تحميل) — تُختبر وحدها.

export function clampPage(page, totalPages) {
  const n = Math.round(Number(page));
  if (!Number.isFinite(n)) return 1;
  return Math.min(totalPages, Math.max(1, n));
}

// رقم السورة التي تبدأ بها الصفحة أو تستمرّ فيها: آخر سورة بدأت عند هذه الصفحة أو قبلها.
// surahPages[i] = صفحة بداية السورة i+1 (تصاعدية).
export function surahOfPage(page, surahPages) {
  let surah = 1;
  for (let i = 0; i < surahPages.length; i++) {
    if (surahPages[i] <= page) surah = i + 1;
    else break;
  }
  return surah;
}

// موضع الصفحة في ملفات البيانات المقسّمة
export function chunkLocation(page, pagesPerChunk) {
  return { chunk: Math.floor((page - 1) / pagesPerChunk), offset: (page - 1) % pagesPerChunk };
}

// مقاطع السطر [[سورة، آية، "رموز"]] → كلمات مفردة تحمل مفتاح آيتها،
// كي تُربط لاحقاً بالنقر على الآية (تفسير، تلاوة، تثبيت) دون تغيير البيانات.
export function wordsOfLine(line) {
  const words = [];
  for (const [s, a, glyphs] of line.v) {
    for (const glyph of glyphs.split(' ')) words.push({ glyph, verse: `${s}:${a}` });
  }
  return words;
}

// نسبة ارتفاع السطر إلى حجم الخط: أدناها يُبقي التشكيل غير متراكب، وأقصاها يمنع
// تباعد الأسطر على الشاشات الطويلة.
const MIN_LINE_RATIO = 1.75;
const MAX_LINE_RATIO = 2.3;
// السطر الذي يبلغ هذه النسبة من عرض السطر الكامل يُمدّ إلى الحافّتين؛ ما دونها (خواتيم السور) يُوسَّط
const JUSTIFY_THRESHOLD = 0.9;
// الصفحتان الأوليان (الفاتحة وأول البقرة) موسّطتان داخل إطار، فلا تملآن العرض
const OPENING_WIDTH_RATIO = 0.72;
// البسملة بين السور أكبر من رموزها في خط الصفحة الأولى
export const BASMALA_SCALE = 1.45;
// سطر أعرض من السطر الكامل بهذه النسبة يُعدّ خطأً في بيانات تقسيم الأسطر
const OVERFULL_RATIO = 1.05;

const lineWidth = (line) => line.words.reduce((sum, w) => sum + w.width, 0);

// عرض «السطر الكامل» في الصفحة: المئين الثمانون لعروض أسطر النص. أسطر المصحف الكاملة
// متساوية العرض تقريباً، فهذا يتجاهل سطراً شاذّاً أعرض منها وخواتيم السور الأقصر.
export function fullLineWidth(widths) {
  const sorted = widths.filter((w) => w != null && w > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 1;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.8))];
}

/**
 * يصحّح كلمة وُضعت في السطر الخطأ في بيانات المصدر: سطر أعرض من الكامل، ونقلُ كلمته
 * الطرفية إلى جاره يقرّب الأسطر من العرض الكامل. ترتيب الكلمات لا يتغيّر — الكلمة تنتقل
 * من آخر السطر إلى أول الذي يليه، أو من أوله إلى آخر الذي قبله، ولا تعبر عنوان سورة.
 * @param lines أسطر الصفحة؛ أسطر النص فيها words: [{ glyph, verse, width }]
 */
export function rebalanceLines(lines) {
  const result = lines.map((line) => (line.k === 't' ? { ...line, words: [...line.words] } : line));
  const full = fullLineWidth(result.filter((l) => l.k === 't').map(lineWidth));
  const isText = (i) => i >= 0 && i < result.length && result[i].k === 't';
  const error = (...items) => items.reduce((sum, line) => sum + Math.abs(lineWidth(line) - full), 0);

  for (let i = 0; i < result.length; i++) {
    // سطر واحد قد يحمل كلمتين زائدتين؛ ثلاث محاولات تكفي وتمنع الدوران
    for (let pass = 0; pass < 3; pass++) {
      const line = result[i];
      if (!isText(i) || lineWidth(line) <= full * OVERFULL_RATIO || line.words.length < 2) break;
      const options = [];
      if (isText(i + 1)) {
        const below = result[i + 1];
        options.push({
          at: i,
          pair: [{ ...line, words: line.words.slice(0, -1) }, { ...below, words: [line.words[line.words.length - 1], ...below.words] }],
          gain: error(line, below),
        });
      }
      if (isText(i - 1)) {
        const above = result[i - 1];
        options.push({
          at: i - 1,
          pair: [{ ...above, words: [...above.words, line.words[0]] }, { ...line, words: line.words.slice(1) }],
          gain: error(above, line),
        });
      }
      const best = options
        .map((o) => ({ ...o, gain: o.gain - error(...o.pair) }))
        .sort((x, y) => y.gain - x.gain)[0];
      if (!best || best.gain <= 0) break;
      [result[best.at], result[best.at + 1]] = best.pair;
    }
  }
  return result;
}

/**
 * حجم الخط وارتفاع السطر لصفحة واحدة.
 * @param lineWidths  عرض كل سطر مقيساً عند baseSize؛ null لعناوين السور
 * @param textLines   لكل سطر: هل هو سطر نص (لا بسملة ولا عنوان)
 * @param width,height أبعاد منطقة الأسطر بالبكسل
 * @param fullLineCount عدد أسطر الصفحة الكاملة في هذه الطبعة (15)
 * @returns fontSize, lineHeight, contentWidth، ولكل سطر: justify (يُمدّ إلى الحافّتين)
 *          و squeeze (نسبة تصغير سطر بقي أعرض من العمود، 1 = بلا تصغير)
 */
export function computePageFit({ lineWidths, textLines, baseSize, width, height, fullLineCount }) {
  const lineCount = lineWidths.length;
  const isOpening = lineCount < fullLineCount;
  const widest = Math.max(1, ...lineWidths.map((w) => w ?? 0));
  // الصفحتان الأوليان تُقاسان بأعرض سطر (كلها موسّطة)، والبقية بعرض السطر الكامل
  const reference = isOpening ? widest : fullLineWidth(lineWidths.filter((_, i) => textLines[i]));
  const usableWidth = width * (isOpening ? OPENING_WIDTH_RATIO : 1);

  const byWidth = (usableWidth * baseSize) / reference;
  const byHeight = height / lineCount / MIN_LINE_RATIO;
  const fontSize = Math.max(1, Math.min(byWidth, byHeight));
  const lineHeight = Math.min(height / lineCount, fontSize * MAX_LINE_RATIO);

  // عرض عمود النص = عرض السطر الكامل عند الحجم المختار. على الشاشات العريضة (حين يحدّ
  // الارتفاعُ الخطَّ) يبقى العمود بنسبة صفحة الكتاب موسَّطاً، ولا تُمدّ الأسطر بعرض الشاشة.
  const contentWidth = Math.min(width, (reference * fontSize) / baseSize / (isOpening ? OPENING_WIDTH_RATIO : 1));
  const referenceAtSize = (reference * fontSize) / baseSize;
  const justify = lineWidths.map((w, i) => !isOpening && textLines[i] && w >= reference * JUSTIFY_THRESHOLD);
  const squeeze = lineWidths.map((w) => {
    const actual = ((w ?? 0) * fontSize) / baseSize;
    const limit = isOpening ? contentWidth : referenceAtSize;
    return actual > limit ? limit / actual : 1;
  });
  return { fontSize, lineHeight, justify, squeeze, contentWidth };
}
