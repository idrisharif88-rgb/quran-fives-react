import { useMemo } from 'react';
import { SURAH_METADATA } from '../../data/quranConstants';
import useMushafPage from '../../hooks/useMushafPage';
import { MUSHAF } from '../../utils/mushafEdition';
import { wordsOfLine, computePageFit, rebalanceLines, BASMALA_SCALE } from '../../utils/mushafLayout';

const BASE_SIZE = 100;

// عرض كل كلمة عند BASE_SIZE، مقيساً في DOM مخفيّ بالخط نفسه.
// الصفحة تُرسم عند BASE_SIZE نفسه ثم تُصغَّر كلها هندسياً (transform: scale)، فالقياس
// هو المرسوم تماماً. عرض الرمز لا يتناسب مع حجم الخط (المتصفّح يقرّب مواضع الرموز عند
// الأحجام الصغيرة)، ولذلك كان القياس عند حجم والرسم عند آخر يُخرج الأسطر عن العمود.
// @param groups [{ family, glyphs: [] }] ← [[عرض كل رمز]]
function measureGlyphs(groups) {
  const host = document.createElement('div');
  host.style.cssText = `position:absolute;left:-99999px;top:0;visibility:hidden;white-space:nowrap;line-height:1;font-size:${BASE_SIZE}px`;
  for (const group of groups) {
    const row = document.createElement('div');
    row.style.fontFamily = `"${group.family}"`;
    for (const glyph of group.glyphs) {
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      span.textContent = glyph;
      row.appendChild(span);
    }
    host.appendChild(row);
  }
  document.body.appendChild(host);
  const widths = [...host.children].map((row) => [...row.children].map((span) => span.getBoundingClientRect().width));
  host.remove();
  return widths;
}

// رموز السطر وخطّها، للقياس
function glyphGroup(line, data) {
  if (line.k === 't') return { family: data.family, glyphs: line.words.map((w) => w.glyph) };
  if (line.k === 'b') return { family: data.basmalaFamily, glyphs: MUSHAF.basmala.glyphs };
  return { family: data.family, glyphs: [] };
}

// يضع العروض المقيسة على كلمات أسطر النص وعلى سطر البسملة
function withWidths(lines, widths) {
  return lines.map((line, i) => {
    if (line.k === 't') return { ...line, words: line.words.map((w, j) => ({ ...w, width: widths[i][j] })) };
    if (line.k === 'b') return { ...line, width: widths[i].reduce((a, b) => a + b, 0) * BASMALA_SCALE };
    return line;
  });
}

// سطر بقي أعرض من العمود يُوسَّط ويُضغط أفقياً بقدره
function TextLine({ words, family, justified, squeeze }) {
  const squeezed = squeeze < 1;
  const style = { fontFamily: `"${family}"` };
  if (squeezed) style.transform = `scaleX(${squeeze})`;
  return (
    <div className={`mushaf-line ${justified && !squeezed ? 'justified' : ''}`.trim()} style={style}>
      {words.map((word, i) => (
        <span key={i} className="mushaf-word" data-verse={word.verse}>{word.glyph}</span>
      ))}
    </div>
  );
}

/**
 * صفحة واحدة من المصحف بأسطرها كما في المطبوع.
 * @param width,height أبعاد المساحة المتاحة للأسطر بالبكسل
 */
export default function MushafPage({ page, width, height }) {
  const { status, data } = useMushafPage(page);

  // القياس وتصحيح الكلمات الموضوعة في غير سطرها: مرة واحدة لكل صفحة
  const lines = useMemo(() => {
    if (!data) return null;
    const parsed = data.lines.map((line) => (line.k === 't' ? { ...line, words: wordsOfLine(line) } : line));
    return rebalanceLines(withWidths(parsed, measureGlyphs(parsed.map((line) => glyphGroup(line, data)))));
  }, [data]);

  // تغيّر أبعاد الشاشة يعيد حساب الحجم فقط
  const fit = useMemo(() => {
    if (!lines || width <= 0 || height <= 0) return null;
    return computePageFit({
      lineWidths: lines.map((line) => {
        if (line.k === 't') return line.words.reduce((sum, w) => sum + w.width, 0);
        return line.k === 'b' ? line.width : null;
      }),
      textLines: lines.map((line) => line.k === 't'),
      baseSize: BASE_SIZE,
      width,
      height,
      fullLineCount: MUSHAF.linesPerPage,
    });
  }, [lines, width, height]);

  if (status === 'error') return <div className="mushaf-page-message">تعذّر تحميل الصفحة</div>;
  if (!fit) return <div className="mushaf-page-message">…</div>;

  // الورقة بحجمها النهائي، وداخلها الأسطر مرسومة عند BASE_SIZE ومصغَّرة بنسبة scale
  const scale = fit.fontSize / BASE_SIZE;
  return (
    <div className="mushaf-lines">
      <div className="mushaf-sheet" style={{ width: `${fit.contentWidth}px`, height: `${fit.lineHeight * lines.length}px` }}>
        <div
          className="mushaf-sheet-scaled"
          style={{
            fontSize: `${BASE_SIZE}px`,
            width: `${fit.contentWidth / scale}px`,
            transform: `scale(${scale})`,
            '--mushaf-line-height': `${fit.lineHeight / scale}px`,
          }}
        >
      {lines.map((line, i) => {
        if (line.k === 's') {
          return (
            <div key={i} className="mushaf-line mushaf-surah-title">
              <span>سورة {SURAH_METADATA[line.s - 1]?.name}</span>
            </div>
          );
        }
        if (line.k === 'b') {
          return (
            <div key={i} className="mushaf-line" style={{ fontFamily: `"${data.basmalaFamily}"`, fontSize: `${BASMALA_SCALE}em` }}>
              {MUSHAF.basmala.glyphs.map((glyph, j) => <span key={j} className="mushaf-word">{glyph}</span>)}
            </div>
          );
        }
        return <TextLine key={i} words={line.words} family={data.family} justified={fit.justify[i]} squeeze={fit.squeeze[i]} />;
      })}
        </div>
      </div>
    </div>
  );
}
