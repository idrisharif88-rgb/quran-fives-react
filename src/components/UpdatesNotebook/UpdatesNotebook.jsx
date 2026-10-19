import { useEffect, useState } from 'react';
import useUpdatesNotebook from '../../hooks/useUpdatesNotebook';
import useKeyboardInset, { revealOnFocus } from '../../hooks/useKeyboardInset';
import { sortedNotes } from '../../utils/updatesNotebook';
import NotebookShareBar, { SHARE_ICON } from './NotebookShareBar';
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

const CHECK = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>;

// في وضع المشاركة تصير الدائرة واللمس اختياراً للملاحظة بدل إنجازها وتعديلها
function NoteRow({ note, onToggle, onEdit, picking, picked, onPick }) {
  if (picking) {
    return (
      <li className={`notebook-note picking ${picked ? 'picked' : ''}`.trim()}>
        <button type="button" className="notebook-check pick" onClick={() => onPick(note.id)} aria-pressed={picked} aria-label="اختر">
          {picked && CHECK}
        </button>
        <button type="button" className="notebook-note-body" onClick={() => onPick(note.id)}>
          {note.title && <strong>{note.title}</strong>}
          {note.text && <span className="notebook-note-text">{note.text}</span>}
        </button>
      </li>
    );
  }
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
  const [picked, setPicked] = useState(null);   // null خارج وضع المشاركة، وإلا Set بالمعرّفات
  const { open, done } = sortedNotes(notebook.notes);
  const all = [...open, ...done];
  const picking = picked !== null;
  const selected = picking ? all.filter((n) => picked.has(n.id)) : [];

  useEffect(() => {
    if (!backRef) return undefined;
    const close = () => {
      if (editing) setEditing(null);
      else if (picking) setPicked(null);
      else onClose();
    };
    backRef.current = close;
    return () => { if (backRef.current === close) backRef.current = null; };
  }, [backRef, editing, picking, onClose]);

  const pick = (id) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allPicked = picking && selected.length === all.length;
  const pickAll = () => setPicked(allPicked ? new Set() : new Set(all.map((n) => n.id)));
  const rowProps = { onToggle: notebook.toggle, onEdit: setEditing, picking, onPick: pick };

  const save = (note) => { notebook.save(note); setEditing(null); };
  const remove = (id) => { notebook.remove(id); setEditing(null); };

  return (
    <div className="notebook-overlay" dir="rtl" style={keyboardInset ? { paddingBottom: keyboardInset + 24 } : undefined}>
      <div className="notebook-card">
        <div className="notebook-head">
          <h2>دفتر التحديثات</h2>
          {!editing && !picking && all.length > 0 && (
            <button type="button" className="notebook-share" onClick={() => setPicked(new Set())} aria-label="مشاركة">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d={SHARE_ICON} /></svg>
            </button>
          )}
          <button type="button" className="notebook-close" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>

        {editing ? (
          <NoteEditor note={editing === 'new' ? null : editing} onSave={save} onCancel={() => setEditing(null)} onDelete={remove} />
        ) : !picking && (
          <button type="button" className="notebook-btn primary notebook-add" onClick={() => setEditing('new')}>+ ملاحظة جديدة</button>
        )}

        {!editing && (
          <>
            {open.length === 0 && done.length === 0 && <p className="notebook-empty">لا ملاحظات بعد</p>}
            <ul className="notebook-list">
              {open.map((n) => <NoteRow key={n.id} note={n} picked={picking && picked.has(n.id)} {...rowProps} />)}
            </ul>
            {done.length > 0 && (
              <>
                <button type="button" className="notebook-done-toggle" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
                  تمّت ({done.length}) {showDone ? '▲' : '▼'}
                </button>
                {(showDone || picking) && (
                  <ul className="notebook-list">
                    {done.map((n) => <NoteRow key={n.id} note={n} picked={picking && picked.has(n.id)} {...rowProps} />)}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </div>
      {picking && !editing && (
        <NotebookShareBar selected={selected} allSelected={allPicked} onToggleAll={pickAll} onCancel={() => setPicked(null)} />
      )}
    </div>
  );
}
