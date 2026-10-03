import { useState, useRef } from 'react';
import { SURAH_METADATA } from '../data/quranConstants';
import { noteKey, readNotesFile, exportNotesFile } from '../utils/verseNotesFile';
import './VerseNotesBack.css';

const PREVIEW_WORDS = 5;

function versePreview(text) {
  const words = text.split(' ');
  return words.length > PREVIEW_WORDS ? words.slice(0, PREVIEW_WORDS).join(' ') + ' …' : text;
}

/**
 * ظهر بطاقة الآيات: ملاحظة لكل آية على البطاقة، تُكتب وتُعدَّل في مكانها،
 * مع تصدير الملاحظات كلها إلى ملف واستيرادها منه.
 */
export default function VerseNotesBack({ verses, notes, onSave, onImport }) {
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const startEdit = (key) => {
    setEditingKey(key);
    setDraft(notes[key] || '');
  };

  const commit = () => {
    onSave(editingKey, draft);
    setEditingKey(null);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const incoming = await readNotesFile(file);
      const count = Object.keys(incoming).length;
      if (count === 0) {
        setMessage('لا توجد ملاحظات صالحة في الملف');
        return;
      }
      onImport(incoming);
      setMessage(`تم استيراد ${count} ملاحظة`);
    } catch {
      setMessage('تعذّرت قراءة الملف — يجب أن يكون JSON');
    }
  };

  const noteCount = Object.keys(notes).length;

  return (
    <div className="verse-notes" dir="rtl">
      <div className="verse-notes-list">
        {verses.map((verse) => {
          const key = noteKey(verse);
          const note = notes[key];
          return (
            <div className="verse-note" key={key}>
              <div className="verse-note-ref">
                <strong>{SURAH_METADATA[verse.s - 1]?.name} {verse.a}</strong>
                <span>{versePreview(verse.t)}</span>
              </div>
              {editingKey === key ? (
                <div className="verse-note-editor">
                  <textarea
                    className="verse-note-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="اكتب تفسير الآية أو ملاحظتك…"
                    autoFocus
                  />
                  <div className="verse-note-editor-actions">
                    <button type="button" className="verse-note-btn primary" onClick={commit}>حفظ</button>
                    <button type="button" className="verse-note-btn" onClick={() => setEditingKey(null)}>إلغاء</button>
                  </div>
                </div>
              ) : (
                <button type="button" className={`verse-note-text ${note ? '' : 'empty'}`.trim()} onClick={() => startEdit(key)}>
                  {note || 'لا توجد ملاحظة — اضغط للكتابة'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* dir=ltr: التصدير في الزاوية اليسرى والاستيراد في اليمنى مهما كان اتجاه الصفحة */}
      <div className="verse-notes-footer" dir="ltr">
        <button
          type="button"
          className="verse-notes-icon-btn"
          onClick={() => exportNotesFile(notes)}
          disabled={noteCount === 0}
          title={`تصدير الملاحظات إلى ملف (${noteCount})`}
          aria-label="تصدير الملاحظات إلى ملف"
        >
          {/* سهم صاعد من صندوق: إخراج الملف */}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15V4" />
            <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
            <path d="M4.5 14v4a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4" />
          </svg>
        </button>
        <span className="verse-notes-message" dir="rtl">{message}</span>
        <button
          type="button"
          className="verse-notes-icon-btn"
          onClick={() => fileInputRef.current?.click()}
          title="استيراد ملاحظات من ملف"
          aria-label="استيراد ملاحظات من ملف"
        >
          {/* سهم نازل إلى صندوق: إدخال الملف */}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v11" />
            <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
            <path d="M4.5 14v4a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" accept=".json,application/json,text/plain" onChange={handleFile} hidden />
      </div>
    </div>
  );
}
