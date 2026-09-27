import { useEffect, useRef, useState, memo } from 'react';
import { searchQuran, findMatchRanges } from '../utils/quranSearch';
import { shareSearchResultsPdf, preloadSearchPdfFonts } from '../utils/quranSearchPdf';
import './QuranSearch.css';

// أرقام عربية مشرقيّة لعرض رقم الآية بما يطابق بقيّة الواجهة
const toArabicDigits = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

// عدد النتائج المعروضة في كل دفعة — الباقي يُعرض عبر «عرض المزيد»
const VISIBLE_STEP = 100;

// يعرض نصّ الآية مع تمييز الكلمة/العبارة المبحوث عنها بالأخضر
const HighlightedVerse = memo(function HighlightedVerse({ text, query }) {
  const ranges = findMatchRanges(text, query);
  if (!ranges.length) return text;

  const parts = [];
  let last = 0;
  ranges.forEach(({ start, end }, i) => {
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <mark key={i} className="quran-search-highlight">
        {text.slice(start, end)}
      </mark>
    );
    last = end;
  });
  if (last < text.length) parts.push(text.slice(last));
  return parts;
});

/**
 * نافذة بحث في القرآن: حقل نصّي أعلى، والنتائج تظهر تحته مباشرة.
 * كل نتيجة تعرض نصّ الآية واسم السورة ورقم الآية، والنقر عليها ينتقل إليها.
 *
 * @param {() => void} onClose            إغلاق نافذة البحث
 * @param {(surah: number, ayah: number) => void} onJump  الانتقال إلى آية مختارة
 */
export default function QuranSearch({ onClose, onJump }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const inputRef = useRef(null);

  // التركيز على الحقل فور فتح النافذة وتجهيز خطوط PDF مسبقاً
  useEffect(() => {
    inputRef.current?.focus();
    preloadSearchPdfFonts();
  }, []);

  // بحث مؤجّل قليلاً كي لا يُعاد فحص 6236 آية مع كل حرف
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      setResults(trimmed ? searchQuran(trimmed) : []);
      setVisibleCount(VISIBLE_STEP);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSharePdf = async () => {
    if (!results.length || isPreparingPdf) return;
    setIsPreparingPdf(true);
    try {
      await shareSearchResultsPdf(results, query.trim());
    } catch (e) {
      alert('تعذّر إنشاء الملف: ' + (e?.message || ''));
    } finally {
      setIsPreparingPdf(false);
    }
  };

  return (
    <div className="quran-search-overlay" dir="rtl" onClick={onClose}>
      <div className="quran-search-card" onClick={(e) => e.stopPropagation()}>
        <div className="quran-search-head">
          <h2 className="quran-search-title">البحث في القرآن</h2>
          <button
            type="button"
            className="quran-search-close"
            onClick={onClose}
            aria-label="إغلاق"
            title="إغلاق"
          >
            ✕
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          className="quran-search-input"
          placeholder="اكتب كلمة أو جزءاً من آية…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
          dir="rtl"
        />

        {results.length > 0 && (
          <div className="quran-search-toolbar">
            <button
              type="button"
              className="quran-search-share-btn"
              onClick={handleSharePdf}
              disabled={isPreparingPdf}
            >
              {isPreparingPdf ? 'جارٍ التحضير…' : 'مشاركة PDF'}
            </button>
            <span className="quran-search-count">
              عدد النتائج: {toArabicDigits(results.length)}
              {visibleCount < results.length ? ` — عرض ${toArabicDigits(visibleCount)}` : ''}
            </span>
          </div>
        )}

        <div className="quran-search-results">
          {query.trim() === '' ? (
            <p className="quran-search-hint">اكتب كلمة من القرآن لتبحث عنها.</p>
          ) : results.length === 0 ? (
            <p className="quran-search-hint">لا نتائج مطابقة.</p>
          ) : (
            <>
              {results.slice(0, visibleCount).map((result) => (
                <button
                  key={`${result.s}-${result.a}`}
                  type="button"
                  className="quran-search-result"
                  onClick={() => onJump?.(result.s, result.a)}
                >
                  <span className="quran-search-verse-text">
                    <HighlightedVerse text={result.t} query={query} />
                  </span>
                  <span className="quran-search-meta">
                    سورة {result.surahName} — آية {toArabicDigits(result.a)}
                  </span>
                </button>
              ))}
              {visibleCount < results.length && (
                <button
                  type="button"
                  className="quran-search-more-btn"
                  onClick={() => setVisibleCount((c) => c + VISIBLE_STEP)}
                >
                  عرض المزيد ({toArabicDigits(results.length - visibleCount)})
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
