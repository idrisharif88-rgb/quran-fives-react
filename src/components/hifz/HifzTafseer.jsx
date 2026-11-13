import { useState } from 'react';
import { SURAH_METADATA } from '../../data/quranConstants';
import { tafseerBooksFor, allowedTafseerBook } from '../../utils/tafseerApi';
import { readAccountStatus } from '../../utils/syncAccount';
import useTafseerText from '../../hooks/useTafseerText';
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

// التفاسير الطويلة (ابن كثير، الطبري…) تُعرض أوّل أسطرها، و«اقرأ المزيد» يفتح الباقي
const LONG_TEXT = 400;

function TafseerText({ text }) {
  const [open, setOpen] = useState(false);
  const long = text.length > LONG_TEXT;
  return (
    <>
      <p className={`hifz-tafseer-note${long && !open ? ' clamped' : ''}`}>{text}</p>
      {long && (
        <button type="button" className="hifz-tafseer-more" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? 'أخفِ' : 'اقرأ المزيد'}
        </button>
      )}
    </>
  );
}

/**
 * تفسير آية: آية اليوم (أو آية يختارها) بأسطر المصحف، وتحتها تفسيرها من كتاب يختاره،
 * يُجلب من الإنترنت حين تُفتح الصفحة (tafseerApi). بلا شبكة: رسالة وزرّ «أعد المحاولة».
 * @param todayRef أول آية ورد اليوم، أو null إن خُتم المصحف
 */
export default function HifzTafseer({ home, todayRef, actions }) {
  const [picking, setPicking] = useState(false);
  const ref = home.tafseer ?? todayRef ?? { s: 1, a: 1 };
  const verseKey = `${ref.s}:${ref.a}`;
  const title = refsText([ref]);
  const isToday = !home.tafseer && Boolean(todayRef);
  const status = readAccountStatus();
  const books = tafseerBooksFor(status);
  const bookId = allowedTafseerBook(home.tafseerBook, status);
  const tafseer = useTafseerText(ref, bookId);

  return (
    <section className="hifz-section hifz-tafseer">
      <h3 className="hifz-section-title">
        {title}{isToday ? ' · آية اليوم' : ''}
        <button type="button" className="hifz-link" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>{picking ? 'إغلاق' : 'غيّر الآية'}</button>
      </h3>
      {picking && (
        <VersePicker
          key={verseKey}
          current={ref}
          onPick={(next) => { actions.setTafseerVerse(next); setPicking(false); }}
          onToday={todayRef && home.tafseer ? () => { actions.setTafseerVerse(null); setPicking(false); } : undefined}
        />
      )}
      <div className="hifz-verse mushaf"><HifzMushafVerses key={verseKey} refs={[ref]} /></div>

      <div className="hifz-tasbeeh-chips" role="radiogroup" aria-label="كتاب التفسير">
        {books.map((book) => (
          <button key={book.id} type="button" role="radio" aria-checked={book.id === bookId} className={`hifz-tasbeeh-chip ${book.id === bookId ? 'active' : ''}`.trim()} onClick={() => actions.setTafseerBook(book.id)}>
            {book.name}
          </button>
        ))}
      </div>

      {tafseer.status === 'loading' && <p className="hifz-home-empty" role="status">جارٍ جلب التفسير…</p>}
      {tafseer.status === 'error' && (
        <div className="hifz-home-empty" role="alert">
          تعذّر جلب التفسير — تحقّق من الإنترنت.
          <button type="button" className="hifz-btn" onClick={tafseer.retry}>أعد المحاولة</button>
        </div>
      )}
      {tafseer.status === 'ok' && <TafseerText key={`${bookId}:${verseKey}`} text={tafseer.text} />}
    </section>
  );
}
