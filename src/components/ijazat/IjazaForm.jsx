import { useState } from 'react';

// أطول سند يُقبل (السند المعتاد 28–32)
const MAX_NAMES = 60;

/**
 * إضافة إجازة على مراحل: نوعها والمُجيز ← «أدخل سندك» ← عدد الأسماء من شيخك حتى الإمام علي
 * ← الأسماء واحداً واحداً (1، 2، 3…). الاسم 1 هو المُجيز، يُملأ سلفاً ويُعدَّل إن شئت.
 * @param step,onStepChange المرحلة يملكها الأب كي يرجع بها زرّ الرجوع خطوةً خطوة
 */
export default function IjazaForm({ step, onStepChange, onSave }) {
  const [type, setType] = useState('');
  const [mojeez, setMojeez] = useState('');
  const [countInput, setCountInput] = useState('');
  const [names, setNames] = useState([]);
  const [at, setAt] = useState(0);

  const count = names.length;
  const startSanad = () => {
    const n = parseInt(countInput, 10);
    if (!Number.isInteger(n) || n < 1 || n > MAX_NAMES) return;
    setNames((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? (i === 0 ? mojeez.trim() : '')));
    setAt(0);
    onStepChange('names');
  };
  const setName = (value) => setNames((prev) => prev.map((v, i) => (i === at ? value : v)));
  const current = names[at] ?? '';
  const isLast = at === count - 1;
  const goNext = () => {
    if (!current.trim()) return;
    if (isLast) onSave({ type: type.trim(), mojeez: mojeez.trim(), chain: names.map((v) => v.trim()) });
    else setAt(at + 1);
  };

  if (step === 'count') {
    const n = parseInt(countInput, 10);
    const valid = Number.isInteger(n) && n >= 1 && n <= MAX_NAMES;
    return (
      <div className="ijaza-form">
        <label className="ijaza-label" htmlFor="ijaza-count">كم اسماً في سندك، من شيخك حتى الإمام علي رضي الله عنه؟</label>
        <input id="ijaza-count" className="ijaza-input ijaza-count" type="number" inputMode="numeric" min="1" max={MAX_NAMES}
          value={countInput} onChange={(e) => setCountInput(e.target.value)} placeholder="مثلاً 28" autoFocus />
        <div className="ijaza-actions">
          <button type="button" className="ijaza-btn" onClick={() => onStepChange('details')}>رجوع</button>
          <button type="button" className="ijaza-btn primary" onClick={startSanad} disabled={!valid}>التالي</button>
        </div>
      </div>
    );
  }

  if (step === 'names') {
    return (
      <div className="ijaza-form">
        <div className="ijaza-progress" aria-hidden="true">
          <span style={{ width: `${((at + 1) / count) * 100}%` }} />
        </div>
        <label className="ijaza-label ijaza-number" htmlFor="ijaza-name">{at + 1}</label>
        <input id="ijaza-name" key={at} className="ijaza-input" value={current} autoFocus
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') goNext(); }}
          placeholder={at === 0 ? 'شيخك المُجيز' : at === count - 1 ? 'الإمام علي رضي الله عنه' : 'الاسم'} />
        <div className="ijaza-actions">
          <button type="button" className="ijaza-btn" onClick={() => (at === 0 ? onStepChange('count') : setAt(at - 1))}>السابق</button>
          <button type="button" className="ijaza-btn primary" onClick={goNext} disabled={!current.trim()}>
            {isLast ? 'حفظ الإجازة' : 'التالي'}
          </button>
        </div>
      </div>
    );
  }

  const ready = type.trim() && mojeez.trim();
  return (
    <div className="ijaza-form">
      <label className="ijaza-label" htmlFor="ijaza-type">نوع الإجازة</label>
      <input id="ijaza-type" className="ijaza-input" value={type} onChange={(e) => setType(e.target.value)} placeholder="مثلاً: حفص عن عاصم" />
      <label className="ijaza-label" htmlFor="ijaza-mojeez">اسم المُجيز</label>
      <input id="ijaza-mojeez" className="ijaza-input" value={mojeez} onChange={(e) => setMojeez(e.target.value)} placeholder="الشيخ الذي أجازك" />
      <div className="ijaza-actions">
        <button type="button" className="ijaza-btn primary" onClick={() => onStepChange('count')} disabled={!ready}>أدخل سندك</button>
      </div>
    </div>
  );
}
