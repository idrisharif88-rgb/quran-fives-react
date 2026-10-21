import { useState } from 'react';
import { birthYears, isUnderAge, saveAgeGate, clearAgeGate, MIN_ACCOUNT_AGE } from '../../utils/ageGate';
import ParentGate from './ParentGate';
import './AgeGate.css';

/**
 * سؤال العمر قبل «حساب جديد». status: 'child' يعرض الاعتذار مباشرة.
 * onPass يُستدعى لمن عمره 13 فأكثر، onChild لمن دونها، onParent حين يتولّى وليّ الأمر.
 */
export default function AgeGate({ status, onPass, onChild, onParent }) {
  const [year, setYear] = useState('');
  const [parent, setParent] = useState(false);

  if (status === 'child' && parent) {
    return <ParentGate onPass={() => { clearAgeGate(); setParent(false); onParent(); }} onCancel={() => setParent(false)} />;
  }

  if (status === 'child') {
    return (
      <div className="age-gate">
        <p className="age-gate-child">
          الحساب لمن عمره {MIN_ACCOUNT_AGE} سنة فأكثر. إن كنت أصغر فاطلب الإذن من والديك.
        </p>
        <button type="button" className="account-form-link" onClick={() => setParent(true)}>
          أنا وليّ الأمر
        </button>
      </div>
    );
  }

  const next = () => {
    if (!year) return;
    const child = isUnderAge(Number(year));
    saveAgeGate(child ? 'child' : 'adult');
    if (child) onChild(); else onPass();
  };

  return (
    <div className="age-gate">
      <label className="account-form-lead" htmlFor="age-gate-year">سنة ميلادك</label>
      <select id="age-gate-year" className="account-form-input" value={year} onChange={(e) => setYear(e.target.value)}>
        <option value="">اختر</option>
        {birthYears().map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button type="button" className="account-form-submit" disabled={!year} onClick={next}>
        التالي
      </button>
    </div>
  );
}
