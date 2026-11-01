import { useEffect, useRef, useState } from 'react';
import { copyText, shareText } from '../utils/verseNoteShare';

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

/** أيقونتا تفسير الآية: نسخ ومشاركة. text ما يُنسخ ويُشارك، مع موضع الآية. */
export default function VerseNoteActions({ text, title, onMessage }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = async () => {
    if (!await copyText(text)) { onMessage('تعذّر النسخ'); return; }
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    if (!await shareText(text, title)) onMessage('المشاركة غير متاحة هنا');
  };

  return (
    <div className="verse-note-actions">
      <button type="button" className="verse-note-action" onClick={copy} aria-label={copied ? 'تم النسخ' : 'نسخ التفسير'} title="نسخ">
        <Icon>
          {copied ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : (
            <>
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
            </>
          )}
        </Icon>
      </button>
      <button type="button" className="verse-note-action" onClick={share} aria-label="مشاركة التفسير" title="مشاركة">
        <Icon>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" />
        </Icon>
      </button>
    </div>
  );
}
