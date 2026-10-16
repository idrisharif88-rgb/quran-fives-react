import { useEffect, useState } from 'react';
import useUpdatesNotebook from '../../hooks/useUpdatesNotebook';
import useKeyboardInset, { revealOnFocus } from '../../hooks/useKeyboardInset';
import { sortedNotes } from '../../utils/updatesNotebook';
import './UpdatesNotebook.css';

const dateText = (ts) => new Date(ts).toLocaleDateString('ar', { day: 'numeric', month: 'long', year: 'numeric' });

function NoteEditor({ note, onSave, onCancel, onDelete }) {
  const [title, setTitle] = useState(note?.title || '');
  const [text, setText] = useState(note?.text || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="notebook-editor">
      <input className="notebook-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="العنوان" dir="auto" autoFocus onFocus={revealOnFocus} />
      <textarea className="notebook-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="التفاصيل" dir="auto" rows={5} onFocus={revealOnFocus} />
      <div className="notebook-editor-actions">
        <button type="button" className="notebook-btn primary" onClick={() => onSave({ id: note?.id, title, text })}>حفظ</button>
        <button type="button" className="notebook-btn" onClick={onCancel}>إلغاء</button>
        {note && (
          <button type="button" className={`notebook-btn ${confirmDelete ? 'danger' : ''}`.trim()} onClick={() => (confirmDelete ? onDelete(note.id) : setConfirmDelete(true))}>
            {confirmDelete ? 'اضغط للتأكيد' : 'حذف'}
          </button>
        )}
      </div>
    </div>
  );
}

function NoteRow({ note, onToggle, onEdit }) {
  return (
    <li className={`notebook-note ${note.done ? 'done' : ''}`.trim()}>
      <button type="button" className="notebook-check" onClick={() => onToggle(note.id)} aria-pressed={note.done} aria-label={note.done ? 'أعد فتحها' : 'تمّت'}>
        {note.done && <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
      </button>
      <button type="button" className="notebook-note-body" onClick={() => onEdit(note)}>
        {note.title && <strong>{note.title}</strong>}
        {note.text && <span className="notebook-note-text">{note.text}</span>}
        <span className="notebook-note-date">{dateText(note.createdAt)}</span>
      </button>
    </li>
  );
}

/**
 * «دفتر التحديثات»: ملاحظات المالك عمّا يريد إضافته للتطبيق. يظهر لحسابه وحده.
 * @param backRef يضع فيه الإغلاق (المحرّر أوّلاً ثم الدفتر) لزرّ الرجوع
 */
export default function UpdatesNotebook({ onClose, backRef }) {
  const notebook = useUpdatesNotebook();
  const keyboardInset = useKeyboardInset();
  const [editing, setEditing] = useState(null);   // null | 'new' | note
  const [showDone, setShowDone] = useState(false);
  const { open, done } = sortedNotes(notebook.notes);

  useEffect(() => {
    if (!backRef) return undefined;
    const close = () => (editing ? setEditing(null) : onClose());
    backRef.current = close;
    return () => { if (backRef.current === close) backRef.current = null; };
  }, [backRef, editing, onClose]);

  const save = (note) => { notebook.save(note); setEditing(null); };
  const remove = (id) => { notebook.remove(id); setEditing(null); };

  return (
    <div className="notebook-overlay" dir="rtl" style={keyboardInset ? { paddingBottom: keyboardInset + 24 } : undefined}>
      <div className="notebook-card">
        <div className="notebook-head">
          <h2>دفتر التحديثات</h2>
          <button type="button" className="notebook-close" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>

        {editing ? (
          <NoteEditor note={editing === 'new' ? null : editing} onSave={save} onCancel={() => setEditing(null)} onDelete={remove} />
        ) : (
          <button type="button" className="notebook-btn primary notebook-add" onClick={() => setEditing('new')}>+ ملاحظة جديدة</button>
        )}

        {!editing && (
          <>
            {open.length === 0 && done.length === 0 && <p className="notebook-empty">لا ملاحظات بعد</p>}
            <ul className="notebook-list">
              {open.map((n) => <NoteRow key={n.id} note={n} onToggle={notebook.toggle} onEdit={setEditing} />)}
            </ul>
            {done.length > 0 && (
              <>
                <button type="button" className="notebook-done-toggle" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
                  تمّت ({done.length}) {showDone ? '▲' : '▼'}
                </button>
                {showDone && (
                  <ul className="notebook-list">
                    {done.map((n) => <NoteRow key={n.id} note={n} onToggle={notebook.toggle} onEdit={setEditing} />)}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
