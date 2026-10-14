import { useState } from 'react';
import { sanadNumbers, SANAD_STEP } from '../../utils/ijazat';
import IjazaNoteBack from './IjazaNoteBack';
import IjazaFile from './IjazaFile';

/**
 * السند بطاقةً بطاقة، في كل بطاقة اسم واحد برقمه في السند.
 * «خماسيات»: الأسماء 5، 10، 15… وحدها. «آحاد»: كل الأسماء 1، 2، 3…
 * صفّ الأرقام يقفز إلى البطاقة، والسهمان إلى السابقة والتالية.
 * زرّ «i» يقلب البطاقة إلى ظهرها: ملاحظات عن صاحب الاسم (مولده، وفاته…) كظهر بطاقة الآيات.
 */
export default function IjazaSanad({ ijaza, onSaveNote, onDelete }) {
  const { chain } = ijaza;
  const [mode, setMode] = useState(() => (chain.length >= SANAD_STEP ? 'fives' : 'ones'));
  const [number, setNumber] = useState(() => (chain.length >= SANAD_STEP ? SANAD_STEP : 1));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [flippedAt, setFlippedAt] = useState(null);   // رقم البطاقة المقلوبة؛ التنقّل يعيد الوجه
  const flipped = flippedAt === number;
  const note = ijaza.notes?.[number] || '';
  const numbers = sanadNumbers(chain.length, mode);
  const at = numbers.indexOf(number);

  // تبديل الوضع يبقي الاسم نفسه، أو أقرب خماسية قبله (والأولى إن كان قبل الخامس)
  const switchMode = (next) => {
    setMode(next);
    if (next === 'fives') setNumber(Math.max(SANAD_STEP, number - (number % SANAD_STEP)));
  };

  return (
    <div className="ijaza-sanad">
      <div className="ijaza-sanad-head">
        <h3>الرواية: {ijaza.type}</h3>
        <p className="ijaza-mojeez">المُجيز: {ijaza.mojeez}</p>
        <span>{chain.length} اسماً</span>
      </div>

      <IjazaFile ijazaId={ijaza.id} />

      <div className="ijaza-mode" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'fives'} className={mode === 'fives' ? 'on' : ''}
          onClick={() => switchMode('fives')} disabled={chain.length < SANAD_STEP}>خماسيات</button>
        <button type="button" role="tab" aria-selected={mode === 'ones'} className={mode === 'ones' ? 'on' : ''}
          onClick={() => switchMode('ones')}>آحاد</button>
      </div>

      <div className="ijaza-marks">
        {numbers.map((n) => (
          <button key={n} type="button" className={`ijaza-mark ${n === number ? 'on' : ''}`.trim()} onClick={() => setNumber(n)}>
            {n}
          </button>
        ))}
      </div>

      {/* البطاقة والسهمان كبطاقة الخماسيات في القراءة: السابق يميناً والتالي يساراً */}
      <div className="ijaza-card-wrap">
        <section key={`${mode}:${number}:${flipped}`} className="ijaza-card">
          <button
            type="button"
            className={`verse-flip-btn ijaza-flip ${flipped ? 'active' : ''}`.trim()}
            onClick={() => setFlippedAt(flipped ? null : number)}
            aria-label={flipped ? 'عرض الاسم' : note ? 'عرض الملاحظات — لهذا الاسم ملاحظات' : 'عرض الملاحظات'}
          >
            {flipped ? <span className="verse-flip-dot" aria-hidden="true" /> : <span className="verse-flip-i" aria-hidden="true">i</span>}
            {!flipped && note && (
              <span className="verse-flip-lamp" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M9 21h6v-1.5H9V21zm3-19a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2z" /></svg>
              </span>
            )}
          </button>
          <span className="ijaza-card-no">{number}</span>
          {flipped ? (
            <IjazaNoteBack name={chain[number - 1]} note={note} onSave={(text) => onSaveNote(number, text)} />
          ) : (
            <>
              <p className="ijaza-card-name">{chain[number - 1]}</p>
              <span className="ijaza-nav-pos">{at + 1} من {numbers.length}</span>
            </>
          )}
        </section>
        <button type="button" className="nav-arrow prev-arrow" onClick={() => setNumber(numbers[at - 1])} disabled={at <= 0} title="السابق">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </button>
        <button type="button" className="nav-arrow next-arrow" onClick={() => setNumber(numbers[at + 1])} disabled={at >= numbers.length - 1} title="التالي">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </button>
      </div>

      <button
        type="button"
        className={`ijaza-btn ${confirmDelete ? 'danger' : 'quiet'}`}
        onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
      >
        {confirmDelete ? 'اضغط مرة أخرى لحذف الإجازة' : 'حذف الإجازة'}
      </button>
    </div>
  );
}
