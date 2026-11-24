import { useState } from 'react';

const SHOWN = 8;   // ما يظهر قبل «الكل»

/**
 * عمليات البحث السابقة (اختيار المالك A): أزرار كما كانت، أوّل ثمانية و«+N الكل».
 * «تعديل» يجعل لمس الزرّ اختياراً، و✕ على كل زرّ يحذفه وحده، ثمّ «احذف المحدّد» أو «امسح الكل».
 */
export default function LibraryRecent({ recent, onSearch, onForget, onClear }) {
  const [all, setAll] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [confirmClear, setConfirmClear] = useState(false);

  if (!recent.length) return null;
  const shown = all || editing ? recent : recent.slice(0, SHOWN);
  const rest = recent.length - SHOWN;

  const toggle = (r) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(r)) next.delete(r); else next.add(r);
    return next;
  });
  const done = () => { setEditing(false); setPicked(new Set()); setConfirmClear(false); };
  const forget = (items) => {
    onForget(items);
    setPicked((prev) => new Set([...prev].filter((r) => !items.includes(r))));
    if (items.length >= recent.length) done();
  };

  return (
    <div className="library-recent-box">
      <div className="library-recent-head">
        <p className="library-label">
          {editing ? (picked.size ? `اختر ما تحذفه — ${picked.size} محدّدة` : 'اختر ما تحذفه') : `عمليات بحث سابقة (${recent.length})`}
        </p>
        <button type="button" className="library-recent-link" onClick={editing ? done : () => setEditing(true)}>
          {editing ? 'تمّ' : 'تعديل'}
        </button>
      </div>

      <div className="library-recent">
        {shown.map((r) => (editing ? (
          <span key={r} className={`library-recent-chip${picked.has(r) ? ' picked' : ''}`}>
            <button type="button" className="library-recent-pick" onClick={() => toggle(r)} aria-pressed={picked.has(r)}>{r}</button>
            <button type="button" className="library-recent-x" onClick={() => forget([r])} aria-label={`احذف «${r}»`}>✕</button>
          </span>
        ) : (
          <button key={r} type="button" onClick={() => onSearch(r)}>{r}</button>
        )))}
        {!editing && rest > 0 && (
          <button type="button" className="library-recent-more" onClick={() => setAll((v) => !v)} aria-expanded={all}>
            {all ? 'أقلّ' : `+${rest} الكل`}
          </button>
        )}
      </div>

      {editing && (
        <div className="library-recent-bar">
          <button type="button" className="library-recent-btn danger" disabled={!picked.size} onClick={() => forget([...picked])}>
            احذف المحدّد{picked.size ? ` (${picked.size})` : ''}
          </button>
          <button type="button" className={`library-recent-btn${confirmClear ? ' danger' : ''}`} onClick={() => (confirmClear ? (onClear(), done()) : setConfirmClear(true))}>
            {confirmClear ? 'اضغط للتأكيد' : 'امسح الكل'}
          </button>
        </div>
      )}
    </div>
  );
}
