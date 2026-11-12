import { useLayoutEffect, useRef } from 'react';

const MIN_PX = 8;

/**
 * نصّ يصغر حتى يتّسع لحاويته. حجم الخطّ في CSS هو الأكبر المسموح، وهذا يقصّه عند الحاجة.
 * سببه: خطّ النظام المكبَّر (font_scale 1.3 على Tab Active 3) يكبّر النصّ في المتصفّح
 * والتطبيق ولا يكبّر الدائرة، فخرج «خميس» من أيقونة التقويم. يُعاد القياس حين يتغيّر النصّ
 * أو يتغيّر مقاس الحاوية (تدوير الشاشة، حجم العرض).
 * @param padding ما يُترك من كلّ جانب داخل الحاوية (px)
 */
export default function FitText({ children, className, padding = 4 }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return undefined;
    const fit = () => {
      el.style.fontSize = '';   // يبدأ من حجم CSS
      const maxW = box.clientWidth - 2 * padding;
      const maxH = box.clientHeight - 2 * padding;
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (size > MIN_PX && (el.scrollWidth > maxW || el.offsetHeight > maxH)) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [children, padding]);

  return <span ref={ref} className={className}>{children}</span>;
}
