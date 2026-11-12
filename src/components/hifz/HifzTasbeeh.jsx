import { useEffect, useRef, useState } from 'react';
import { activeTasbeeh, tasbeehRounds } from '../../utils/hifzHome';
import { playChime } from '../../utils/chime';
import HifzRing from './HifzRing';
import HifzZikrForm from './HifzZikrForm';

/**
 * مسبحتي: حلقة كبيرة تُضغط فتعدّ إلى هدف الذكر الجاري. بلوغه دورة: نغمة جرس، والحلقة
 * تومض لحظة (NEXT_DELAY_MS) لا تُحسب فيها ضغطة، ثم يُفتح الذكر التالي من صفر.
 * للعودة إلى ذكر سابق يُضغط اسمه. الذكر يُضاف من عند صاحبه بعدده.
 */
const NEXT_DELAY_MS = 1500;

export default function HifzTasbeeh({ home, day, actions }) {
  const [editing, setEditing] = useState(false);
  const zikr = activeTasbeeh(home);
  const full = Boolean(zikr) && home.tasbeehCount >= zikr.target;
  const timerRef = useRef(null);
  const [advancing, setAdvancing] = useState(false);

  // مغادرة الصفحة أثناء الوميض: يُفتح الذكر التالي فوراً كي لا يبقى العدّ عند هدفه
  const nextRef = useRef(actions.nextTasbeeh);
  useEffect(() => { nextRef.current = actions.nextTasbeeh; }, [actions.nextTasbeeh]);
  useEffect(() => () => {
    if (timerRef.current) { clearTimeout(timerRef.current); nextRef.current(); }
  }, []);

  const tap = () => {
    if (advancing || !zikr) return;
    // ذكر وصل هدفه قبل اليوم (أو قبل هذه الميزة): ضغطة تفتح التالي بلا عدّ
    if (full) { actions.nextTasbeeh(); return; }
    actions.tapTasbeeh();
    if (home.tasbeehCount + 1 < zikr.target) return;
    playChime();
    setAdvancing(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setAdvancing(false);
      actions.nextTasbeeh();
    }, NEXT_DELAY_MS);
  };

  const pick = (id) => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    setAdvancing(false);
    actions.pickTasbeeh(id);
  };
  return (
    <section className="hifz-section hifz-tasbeeh">
      {zikr ? (
        <>
          <button type="button" className={`hifz-tasbeeh-tap ${full ? 'full' : ''}`.trim()} onClick={tap} aria-label={`سبّح: ${zikr.text} — ${home.tasbeehCount} من ${zikr.target}`}>
            <HifzRing value={home.tasbeehCount} total={zikr.target}>
              <strong>{home.tasbeehCount}</strong>
              <span>من {zikr.target}</span>
            </HifzRing>
          </button>
          <div className="hifz-tasbeeh-zikr">{zikr.text}</div>
          <div className="hifz-home-row">
            <span>دورات اليوم: <b>{tasbeehRounds(home, day)}</b></span>
            <button type="button" className="hifz-link" onClick={actions.zeroTasbeeh} disabled={home.tasbeehCount === 0}>صفّر العدّ</button>
          </div>
        </>
      ) : <p className="hifz-home-empty">لا ذكر في مسبحتك. أضف ذكرك من الأسفل.</p>}

      <h3 className="hifz-section-title">
        الذكر
        <button type="button" className="hifz-link" onClick={() => setEditing((v) => !v)}>{editing ? 'تمّ' : 'عدّل'}</button>
      </h3>
      <div className="hifz-tasbeeh-chips">
        {home.tasbeeh.map((z) => (
          <span key={z.id} className="hifz-tasbeeh-chip-wrap">
            <button type="button" className={`hifz-tasbeeh-chip ${z.id === home.tasbeehActive ? 'active' : ''}`.trim()} onClick={() => pick(z.id)} aria-pressed={z.id === home.tasbeehActive}>
              {z.text} <small>{z.target}</small>
            </button>
            {editing && <button type="button" className="hifz-home-remove" onClick={() => actions.removeTasbeeh(z.id)} aria-label={`احذف: ${z.text}`}>✕</button>}
          </span>
        ))}
      </div>
      {(editing || !zikr) && <HifzZikrForm onAdd={actions.addTasbeeh} defaultTarget={33} />}
    </section>
  );
}
