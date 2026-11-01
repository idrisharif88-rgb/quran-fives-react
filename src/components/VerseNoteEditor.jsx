import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './VerseNoteEditor.css';

const stop = (e) => e.stopPropagation();

/**
 * نافذة كتابة التفسير: تغطّي التطبيق كلّه فلا يتعلّق مربّع الكتابة بحجم البطاقة،
 * وبعد الحفظ أو الإلغاء تعود البطاقة كما كانت لأنّها لم تُغلق تحتها.
 * زرّ الرجوع يلغي عبر backRef (انظر handleHardwareBack).
 */
export default function VerseNoteEditor({ title, verse, initialText, onSave, onCancel, backRef }) {
  const [draft, setDraft] = useState(initialText);
  const [host] = useState(() => document.querySelector('.app-container') || document.body);

  useEffect(() => {
    if (!backRef) return undefined;
    backRef.current = onCancel;
    return () => { backRef.current = null; };
  }, [backRef, onCancel]);

  // البوّابة تمرّر أحداث React إلى آباء البطاقة، فتوقَف هنا كي لا يقلّب السحب الآيات تحت النافذة
  return createPortal(
    <div
      className="verse-note-window"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      dir="rtl"
      onTouchStart={stop}
      onTouchEnd={stop}
      onClick={stop}
    >
      <div className="verse-note-window-head">
        <strong>{title}</strong>
        <span>{verse}</span>
      </div>
      <textarea
        className="verse-note-window-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="اكتب تفسير الآية أو ملاحظتك…"
        autoFocus
      />
      <div className="verse-note-window-actions">
        <button type="button" className="verse-note-btn primary" onClick={() => onSave(draft)}>حفظ</button>
        <button type="button" className="verse-note-btn" onClick={onCancel}>إلغاء</button>
      </div>
    </div>,
    host,
  );
}
