import React, { useState, useEffect, useRef } from 'react';
import DuaEditor from './DuaEditor';

const NO_PRESETS = [];

const nowStamp = () => new Date().toLocaleString('ar-EG', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

const QuranicWonders = ({
  onClose,
  notes,
  setNotes,
  fontSize,
  fontFamily,
  fontWeight,
  fontColor,
  isNightMode
}) => {
  // الكتابة في نافذة مثبّتة أعلى الشاشة (محرّر الدعاء نفسه): حقل أسفل الشاشة كانت
  // تغطّيه لوحة المفاتيح. editor = null | { id: معرّف الملاحظة أو null للجديدة, text }
  const [editor, setEditor] = useState(null);
  const notesListRef = useRef(null);

  const resolvedFontColor = isNightMode && fontColor === 'darkgreen'
    ? 'var(--app-accent)'
    : fontColor;

  const handleSaveNote = (text) => {
    if (text === '') { setEditor(null); return; }
    if (editor.id) {
      setNotes(prevNotes => prevNotes.map(note => (
        note.id === editor.id ? { ...note, text, timestamp: nowStamp() } : note
      )));
    } else {
      setNotes(prevNotes => [...prevNotes, { id: Date.now().toString(), text, timestamp: nowStamp() }]);
    }
    setEditor(null);
  };

  const handleDeleteNote = (id) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
  };

  useEffect(() => {
    // التمرير إلى الأسفل عند التحميل الأولي أو عند تغيير الملاحظات
    if (notesListRef.current) {
      notesListRef.current.scrollTop = notesListRef.current.scrollHeight;
    }
  }, [notes]);

  return (
    <div className="quranic-wonders-container" dir="rtl" style={{
      '--app-font-size': `${fontSize}px`,
      '--app-font-family': fontFamily,
      '--app-font-weight': fontWeight,
      '--app-font-color': resolvedFontColor,
    }}>
      <div className="quranic-wonders-header">
        <h2 className="quranic-wonders-title">عجائب قرآنية</h2>
        <button type="button" className="quranic-wonders-close-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div className="quranic-wonders-notes-list" ref={notesListRef}>
        {notes.length === 0 ? (
          <p className="quranic-wonders-empty">لا توجد ملاحظات بعد. أضف ملاحظتك الأولى!</p>
        ) : (
          notes.map(note => (
            <div key={note.id} className="quranic-wonders-note-item">
              <p className="quranic-wonders-note-text" style={{
                fontSize: `calc(${fontSize}px * 0.9)`,
                fontFamily: fontFamily,
                fontWeight: fontWeight,
                color: resolvedFontColor
              }}>{note.text}</p>
              <div className="quranic-wonders-note-meta">
                <span className="quranic-wonders-note-timestamp">{note.timestamp}</span>
                <div className="quranic-wonders-note-actions">
                  <button type="button" onClick={() => setEditor({ id: note.id, text: note.text })} className="quranic-wonders-action-btn edit-btn">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.12 1.12 3.75 3.75 1.12-1.12z"/></svg>
                  </button>
                  <button type="button" onClick={() => handleDeleteNote(note.id)} className="quranic-wonders-action-btn delete-btn">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="quranic-wonders-input-area">
        <button type="button" className="quranic-wonders-main-btn" onClick={() => setEditor({ id: null, text: '' })}>
          إضافة ملاحظة
        </button>
      </div>

      {editor && (
        <DuaEditor
          title={editor.id ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}
          placeholder="اكتب ملاحظتك هنا..."
          presets={NO_PRESETS}
          initialDua={editor.text}
          onSave={handleSaveNote}
          onCancel={() => setEditor(null)}
        />
      )}
    </div>
  );
};

export default QuranicWonders;