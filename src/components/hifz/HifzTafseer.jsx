import { useState } from 'react';
import { SURAH_METADATA } from '../../data/quranConstants';
import { noteKey } from '../../utils/verseNotesFile';
import VerseNoteEditor from '../VerseNoteEditor';
import HifzMushafVerses from './HifzMushafVerses';
import { refsText } from './hifzText';

// اختيار آية: سورة ورقم آية. «آية اليوم» تعيد الافتراضي.
function VersePicker({ current, onPick, onToday }) {
  const [surah, setSurah] = useState(current.s);
  const [ayah, setAyah] = useState(String(current.a));
  const verseCount = SURAH_METADATA[surah - 1].verseCount;
  const a = Number(ayah);
  const valid = Number.isInteger(a) && a >= 1 && a <= verseCount;
  return (
    <div className="hifz-tafseer-picker">
      <div className="hifz-start-custom-row">
        <select className="hifz-start-field" value={surah} onChange={(e) => { setSurah(Number(e.target.value)); setAyah('1'); }} aria-label="السورة">
          {SURAH_METADATA.map((s) => <option key={s.id} value={s.id}>{s.id}. {s.name}</option>)}
        </select>
        <input className="hifz-start-field hifz-start-ayah" type="number" inputMode="numeric" min={1} max={verseCount} value={ayah} onChange={(e) => setAyah(e.target.value)} aria-label="رقم الآية" />
      </div>
      <span className="hifz-home-note">{valid ? `آيات السورة: ${verseCount}` : `رقم الآية من 1 إلى ${verseCount}`}</span>
      <div className="hifz-tafseer-actions">
        <button type="button" className="hifz-btn primary" disabled={!valid} onClick={() => onPick({ s: surah, a })}>اعرضها</button>
        {onToday && <button type="button" className="hifz-btn" onClick={onToday}>آية اليوم</button>}
      </div>
    </div>
  );
}

/**
 * تفسير آية: آية اليوم (أو آية يختارها) بأسطر المصحف، وتحتها ما كتبه صاحبها من تفسير.
 * التفسير نفسه ملاحظات الآيات في التطبيق (verseNotes)، فما يُكتب هنا يظهر على بطاقة الخماسيات.
 * @param todayRef     أول آية ورد اليوم، أو null إن خُتم المصحف
 * @param notes        { 'سورة:آية': نصّ }
 * @param onSaveNote   (key, text)
 * @param noteBackRef  لزرّ الرجوع ما دامت نافذة الكتابة مفتوحة
 */
export default function HifzTafseer({ home, todayRef, notes, onSaveNote, noteBackRef, actions }) {
  const [picking, setPicking] = useState(false);
  const [writing, setWriting] = useState(false);
  const ref = home.tafseer ?? todayRef ?? { s: 1, a: 1 };
  const key = noteKey(ref);
  const note = notes?.[key]?.trim() || '';
  const title = refsText([ref]);
  const isToday = !home.tafseer && Boolean(todayRef);

  return (
    <section className="hifz-section hifz-tafseer">
      <h3 className="hifz-section-title">
        {title}{isToday ? ' · آية اليوم' : ''}
        <button type="button" className="hifz-link" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>{picking ? 'إغلاق' : 'غيّر الآية'}</button>
      </h3>
      {picking && (
        <VersePicker
          key={key}
          current={ref}
          onPick={(next) => { actions.setTafseerVerse(next); setPicking(false); }}
          onToday={todayRef && home.tafseer ? () => { actions.setTafseerVerse(null); setPicking(false); } : undefined}
        />
      )}
      <div className="hifz-verse mushaf"><HifzMushafVerses key={key} refs={[ref]} /></div>
      {note
        ? <p className="hifz-tafseer-note">{note}</p>
        : <p className="hifz-home-empty">لم تكتب تفسير هذه الآية بعد.</p>}
      <button type="button" className={`hifz-btn ${note ? '' : 'primary'}`.trim()} onClick={() => setWriting(true)}>{note ? 'عدّل التفسير' : 'اكتب تفسيرها'}</button>
      {writing && (
        <VerseNoteEditor
          title="تفسير"
          verse={title}
          initialText={note}
          onSave={(text) => { onSaveNote(key, text); setWriting(false); }}
          onCancel={() => setWriting(false)}
          backRef={noteBackRef}
        />
      )}
    </section>
  );
}
