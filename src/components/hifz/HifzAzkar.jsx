import { useState } from 'react';
import { zikrCount, azkarSummary } from '../../utils/hifzHome';
import HifzZikrForm from './HifzZikrForm';

/**
 * أذكاري: قائمة يعدّلها صاحبها. ضغطة على الذكر تعدّ واحدة حتى هدفه؛ العدّ يبدأ من صفر كل يوم.
 * @param home / day / actions ما يعيده useHifzHome
 */
export default function HifzAzkar({ home, day, actions }) {
  const [editing, setEditing] = useState(false);
  const { done, total } = azkarSummary(home, day);
  return (
    <>
      <section className="hifz-section hifz-azkar-head">
        <div className="hifz-home-row"><span>أذكار اليوم</span><b>{done} من {total}</b></div>
        <div className="hifz-dayprog-segs">
          {home.azkar.map((z) => <i key={z.id} className={zikrCount(home, day, z.id) >= z.target ? 'on' : ''} />)}
        </div>
      </section>

      <section className="hifz-section">
        <h3 className="hifz-section-title">
          أذكاري
          <button type="button" className="hifz-link" onClick={() => setEditing((v) => !v)}>{editing ? 'تمّ' : 'عدّل'}</button>
        </h3>
        {home.azkar.length === 0 && <p className="hifz-home-empty">لا أذكار في قائمتك. اضغط «عدّل» وأضف ذكرك.</p>}
        <ul className="hifz-azkar-list">
          {home.azkar.map((z) => {
            const count = zikrCount(home, day, z.id);
            const complete = count >= z.target;
            return (
              <li key={z.id} className={complete ? 'done' : ''}>
                <button type="button" className="hifz-azkar-tap" onClick={() => actions.tapZikr(z.id)} disabled={editing} aria-label={`${z.text} — ${count} من ${z.target}`}>
                  <span className="hifz-azkar-text">{z.text}</span>
                  <span className="hifz-azkar-count" dir={complete ? undefined : 'ltr'}>{complete ? 'تمّ' : `${count} / ${z.target}`}</span>
                  <span className="hifz-azkar-bar"><i style={{ width: `${Math.min(100, (count / z.target) * 100)}%` }} /></span>
                </button>
                {editing && <button type="button" className="hifz-home-remove" onClick={() => actions.removeZikr(z.id)} aria-label={`احذف: ${z.text}`}>✕</button>}
              </li>
            );
          })}
        </ul>
        {editing
          ? <HifzZikrForm onAdd={actions.addZikr} defaultTarget={10} />
          : <p className="hifz-home-note">اضغط الذكر لتعدّ. العدّ يبدأ من صفر كل يوم.</p>}
      </section>
    </>
  );
}
