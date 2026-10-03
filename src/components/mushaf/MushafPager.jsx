import { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';
import MushafPage from './MushafPage';
import { MUSHAF } from '../../utils/mushafEdition';

// عدد الصفحات المرسومة على كل جانب من الصفحة الحالية — البقية خانات فارغة
const RENDER_AHEAD = 1;
// هامش الصفحة داخل خانتها ومساحة رقم الصفحة أسفلها (يطابقان MushafReader.css)
const PAD_X = 14;
const PAD_TOP = 6;
const FOOT_HEIGHT = 30;

const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

/**
 * تقليب الصفحات بالسحب الأفقي (scroll-snap).
 * الحاوية LTR عمداً والخانات بترتيب معكوس (الصفحة 1 في أقصى اليمين): هكذا تكون
 * الصفحة التالية إلى اليسار كالكتاب العربي، وscrollLeft موجب دائماً — قيمته في
 * حاوية RTL تختلف بين إصدارات WebView.
 * @param onTap نقرة على الصفحة (لا سحب) — تبديل ملء الشاشة
 */
export default function MushafPager({ page, onPageChange, onTap }) {
  const pagerRef = useRef(null);
  const frameRef = useRef(0);
  const settleRef = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const total = MUSHAF.totalPages;

  // عرض الخانة الفعلي (قد يكون كسرياً على الهواتف). clientWidth مقرَّب إلى عدد صحيح،
  // وضربُه في مئات الخانات يراكم الخطأ فتنزاح الصفحة عن موضعها.
  const slotWidth = () => pagerRef.current?.firstElementChild?.getBoundingClientRect().width || 0;
  const shownPage = useCallback(() => {
    const width = slotWidth();
    return width > 0 ? total - Math.round(pagerRef.current.scrollLeft / width) : null;
  }, [total]);

  // محاذاة خانة الصفحة مع حافّة الحاوية بالضبط، بفرق الموضعين الفعليين
  const alignToPage = useCallback((target) => {
    const el = pagerRef.current;
    const slot = el?.children[total - target];
    if (!slot) return;
    const delta = slot.getBoundingClientRect().left - el.getBoundingClientRect().left;
    if (Math.abs(delta) > 0.5) el.scrollLeft += delta;
  }, [total]);

  const scrollToPage = useCallback((target) => {
    const el = pagerRef.current;
    const width = slotWidth();
    if (!el || width === 0) return;
    el.scrollLeft = (total - target) * width;
    alignToPage(target);
  }, [total, alignToPage]);

  // قياس الحاوية، وإعادة التموضع عند تغيّر حجمها (تدوير، لوحة مفاتيح)
  useLayoutEffect(() => {
    const el = pagerRef.current;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // مزامنة موضع التمرير مع الصفحة: عند الفتح، وعند تغيّر الحجم، وعند القفز من نافذة الانتقال
  useLayoutEffect(() => {
    if (size.width === 0) return;
    if (shownPage() !== page) scrollToPage(page);
    else alignToPage(page);
  }, [page, size.width, size.height, shownPage, scrollToPage, alignToPage]);

  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current);
    clearTimeout(settleRef.current);
  }, []);

  const handleScroll = () => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const shown = shownPage();
      if (shown != null && shown !== page && shown >= 1 && shown <= total) onPageChange(shown);
    });
    // بعد سكون التمرير: توسيط الصفحة تماماً إن توقّف الالتقاط دون حافّتها
    clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => {
      const shown = shownPage();
      if (shown != null && shown >= 1 && shown <= total) alignToPage(shown);
    }, 160);
  };

  const linesWidth = size.width - PAD_X * 2;
  const linesHeight = size.height - PAD_TOP - FOOT_HEIGHT;

  return (
    <div className="mushaf-pager" dir="ltr" ref={pagerRef} onScroll={handleScroll} onClick={onTap}>
      {Array.from({ length: total }, (_, i) => {
        const slotPage = total - i;
        const near = Math.abs(slotPage - page) <= RENDER_AHEAD;
        return (
          <div className="mushaf-slot" key={slotPage} dir="rtl">
            {near && size.width > 0 && (
              <>
                <MushafPage page={slotPage} width={linesWidth} height={linesHeight} />
                <div className="mushaf-page-number">{toArabicDigits(slotPage)}</div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
