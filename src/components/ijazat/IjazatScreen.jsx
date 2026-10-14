import { useEffect, useState } from 'react';
import IjazaForm from './IjazaForm';
import IjazaSanad from './IjazaSanad';
import { removeIjazaFile } from '../../utils/ijazaFileStore';
import './Ijazat.css';

// الرجوع درجةً درجة: السند ← القائمة؛ وفي الإضافة: الأسماء ← العدد ← البيانات ← القائمة
const parentOf = (view) => {
  if (view.name === 'form' && view.step === 'names') return { name: 'form', step: 'count' };
  if (view.name === 'form' && view.step === 'count') return { name: 'form', step: 'details' };
  return { name: 'list' };
};

/**
 * قسم «إجازاتي»: إجازات الحافظ وأسانيدها، يُعرض السند بطاقات خماسيات أو آحاد.
 * @param backRef يضع فيه الرجوع درجةً ما دام خارج القائمة؛ في القائمة يغلق App القسم
 */
export default function IjazatScreen({ ijazat, onAdd, onRemove, onSaveNote, onClose, backRef }) {
  const [view, setView] = useState({ name: 'list' });
  const ijaza = view.id ? ijazat.find((ij) => ij.id === view.id) : null;

  useEffect(() => {
    if (!backRef || view.name === 'list') return undefined;
    const back = () => setView(parentOf(view));
    backRef.current = back;
    return () => { if (backRef.current === back) backRef.current = null; };
  }, [backRef, view]);

  let body;
  let title = 'إجازاتي';
  if (view.name === 'form') {
    title = 'إجازة جديدة';
    body = (
      <IjazaForm
        step={view.step}
        onStepChange={(step) => setView({ name: 'form', step })}
        onSave={(data) => setView({ name: 'sanad', id: onAdd(data) })}
      />
    );
  } else if (view.name === 'sanad' && ijaza) {
    title = 'السند';
    body = (
      <IjazaSanad
        ijaza={ijaza}
        onSaveNote={(number, note) => onSaveNote(ijaza.id, number, note)}
        onDelete={() => { removeIjazaFile(ijaza.id); onRemove(ijaza.id); setView({ name: 'list' }); }}
      />
    );
  } else {
    body = (
      <div className="ijazat-list">
        {ijazat.length === 0 && (
          <p className="ijazat-empty">لا إجازات بعد. أضف إجازتك ثم أدخل سندها اسماً اسماً، ويُعرض بطاقاتٍ خمسةً خمسة أو اسماً اسماً.</p>
        )}
        {ijazat.map((ij) => {
          return (
            <button key={ij.id} type="button" className="ijazat-item" onClick={() => setView({ name: 'sanad', id: ij.id })}>
              <strong>{ij.type}</strong>
              <span>المُجيز: {ij.mojeez}</span>
              <span className="ijazat-item-meta">{ij.chain.length} اسماً</span>
            </button>
          );
        })}
        <button type="button" className="ijaza-btn primary" onClick={() => setView({ name: 'form', step: 'details' })}>إضافة إجازة</button>
      </div>
    );
  }

  return (
    <div className="ijazat-screen" dir="rtl">
      <div className="ijazat-header">
        {view.name !== 'list' ? (
          <button type="button" className="ijazat-icon-btn" onClick={() => setView(parentOf(view))} aria-label="رجوع">›</button>
        ) : <span className="ijazat-icon-btn" aria-hidden="true" />}
        <h2>{title}</h2>
        <button type="button" className="ijazat-icon-btn" onClick={onClose} aria-label="إغلاق">×</button>
      </div>
      <div className="ijazat-body">{body}</div>
    </div>
  );
}
