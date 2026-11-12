import { useState } from 'react';
import { activeTasbeeh, tasbeehRounds } from '../../utils/hifzHome';
import HifzRing from './HifzRing';
import HifzZikrForm from './HifzZikrForm';

/**
 * مسبحتي: حلقة كبيرة تُضغط فتعدّ إلى هدف الذكر الجاري؛ بلوغه دورة، والضغطة بعده تبدأ دورة.
 * الذكر يُختار من القائمة أو يُضاف من عند صاحبه بعدده.
 */
export default function HifzTasbeeh({ home, day, actions }) {
  const [editing, setEditing] = useState(false);
  const zikr = activeTasbeeh(home);
  const full = Boolean(zikr) && home.tasbeehCount >= zikr.target;
  return (
    <section className="hifz-section hifz-tasbeeh">
      {zikr ? (
        <>
          <button type="button" className={`hifz-tasbeeh-tap ${full ? 'full' : ''}`.trim()} onClick={actions.tapTasbeeh} aria-label={`سبّح: ${zikr.text} — ${home.tasbeehCount} من ${zikr.target}`}>
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
            <button type="button" className={`hifz-tasbeeh-chip ${z.id === home.tasbeehActive ? 'active' : ''}`.trim()} onClick={() => actions.pickTasbeeh(z.id)} aria-pressed={z.id === home.tasbeehActive}>
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
