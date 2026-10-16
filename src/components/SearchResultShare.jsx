import { useState } from 'react';
import { shareResultText, shareResultPdf, shareResultImage } from '../utils/searchResultShare';
import './SearchResultShare.css';

const FORMATS = [
  { key: 'text', label: 'نص', run: shareResultText },
  { key: 'pdf', label: 'PDF', run: shareResultPdf },
  { key: 'image', label: 'صورة', run: shareResultImage },
];

/**
 * زر مشاركة لنتيجة بحث واحدة: يفتح تحتها صفّاً من ثلاثة خيارات.
 */
export default function SearchResultShare({ result, query }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  const handleShare = async ({ key, run }) => {
    if (busy) return;
    setBusy(key);
    // دع المتصفّح يرسم حالة الانتظار قبل الرسم الثقيل
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      await run(result, query.trim());
      setOpen(false);
    } catch (e) {
      alert('تعذّرت المشاركة: ' + (e?.message || ''));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`search-share-toggle${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="مشاركة الآية"
        aria-expanded={open}
        title="مشاركة"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
      </button>
      {open && (
        <div className="search-share-options">
          {FORMATS.map((format) => (
            <button
              key={format.key}
              type="button"
              className="search-share-option"
              onClick={() => handleShare(format)}
              disabled={busy !== null}
            >
              {busy === format.key ? '…' : format.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
