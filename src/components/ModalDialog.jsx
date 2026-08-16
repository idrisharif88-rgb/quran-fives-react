import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ModalDialog.css';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * نافذة حواريّة حقيقية: تحجب التفاعل مع بقيّة التطبيق حتى يختار المستخدم.
 *
 * تُعرض عبر portal، لأن البطاقات في التطبيق تجمع overflow: hidden مع حركات
 * تحرّك transform، وعنصرُ transform يصير كتلةً حاويةً حتى للعناصر الثابتة
 * (position: fixed) فيقصّها. لكنّ الهدف هو .app-container لا <body>:
 * متغيّرات اللون كلّها معرّفة على .app-container، والمتغيّرات تُورَّث نزولاً
 * فقط — فالـportal إلى <body> يجعل var(--app-surface) بلا قيمة، والخلفية
 * تعود إلى الشفّاف فيظهر التطبيق من خلف النافذة نفسها. و.app-container خالٍ
 * من transform/filter فلا يقصّ العناصر الثابتة داخله.
 *
 * طبقتها فوق لوحة المفاتيح المخصّصة (13000) وطبقة تجهيز الصورة (12500)،
 * وإلّا بقي ما فوقها قابلاً للنقر من خلف الحاجب.
 *
 * @param title       عنوان النافذة، يُستعمل أيضاً تسميةً للقارئ الصوتي
 * @param onClose     يُستدعى عند ✕ أو Escape أو النقر خارج النافذة
 * @param dismissible إن كانت false فلا إغلاق إلا بأزرار المحتوى نفسه
 * @param size        'sm' لنافذة قصيرة بمحتواها، 'md' لقائمة تُمرّر داخلها
 */
export default function ModalDialog({
  title,
  onClose,
  children,
  size = 'md',
  dismissible = true,
  className = '',
}) {
  const dialogRef = useRef(null);
  const restoreFocusRef = useRef(null);
  // يُحسم مرّة واحدة عند التركيب: تغيّر هدف الـportal بين الرسمات يعيد تركيب المحتوى
  const [host] = useState(() => document.querySelector('.app-container') || document.body);

  const requestClose = useCallback(() => {
    if (dismissible) onClose?.();
  }, [dismissible, onClose]);

  // قفل تمرير الصفحة خلف النافذة، مع إعادة القيمة السابقة حرفياً عند الإغلاق
  // (لا 'auto' مفروضة) كي لا تُداس أنماط التطبيق الأخرى على body.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  // نقل التركيز إلى النافذة عند الفتح، وإعادته إلى الزرّ الذي فتحها عند الإغلاق
  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    const first = dialogRef.current?.querySelector(FOCUSABLE);
    (first || dialogRef.current)?.focus?.();
    return () => {
      const target = restoreFocusRef.current;
      if (target && typeof target.focus === 'function' && document.contains(target)) {
        target.focus();
      }
    };
  }, []);

  // Escape للإغلاق، وTab محبوس داخل النافذة فلا يهرب التركيز إلى ما خلفها
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE) || [])
        .filter(el => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [requestClose]);

  return createPortal(
    <div className="modal-scrim" onMouseDown={requestClose}>
      <div
        ref={dialogRef}
        className={`modal-dialog modal-dialog--${size} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        dir="rtl"
        tabIndex={-1}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          {dismissible && (
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="إغلاق"
              title="إغلاق"
            >
              ✕
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    host,
  );
}
