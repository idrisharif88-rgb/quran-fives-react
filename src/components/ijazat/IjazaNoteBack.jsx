import { useState } from 'react';

/**
 * ظهر بطاقة الاسم في السند: ملاحظة واحدة تُكتب وتُعدَّل في مكانها (مولده، وفاته، شيوخه…).
 * نصّ فارغ يحذفها.
 */
export default function IjazaNoteBack({ name, note, onSave }) {
  const [editing, setEditing] = useState(!note);
  const [draft, setDraft] = useState(note);

  if (!editing) {
    return (
      <div className="ijaza-note">
        <strong>{name}</strong>
        <button type="button" className="ijaza-note-text" onClick={() => setEditing(true)}>{note}</button>
      </div>
    );
  }

  return (
    <div className="ijaza-note">
      <label htmlFor="ijaza-note-input"><strong>{name}</strong></label>
      <textarea
        id="ijaza-note-input"
        className="ijaza-input ijaza-note-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="مولده، وفاته، بلده، شيوخه…"
        rows={4}
        autoFocus
      />
      <div className="ijaza-actions">
        {note && <button type="button" className="ijaza-btn" onClick={() => { setDraft(note); setEditing(false); }}>إلغاء</button>}
        <button type="button" className="ijaza-btn primary" onClick={() => { onSave(draft); setEditing(!draft.trim()); }}>حفظ</button>
      </div>
    </div>
  );
}
