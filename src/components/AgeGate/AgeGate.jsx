import { useState } from 'react';
import { birthYears, isUnderAge, saveAgeGate, MIN_ACCOUNT_AGE } from '../../utils/ageGate';
import './AgeGate.css';

/**
 * سؤال العمر قبل «حساب جديد». status: 'child' يعرض الاعتذار مباشرة.
 * onPass يُستدعى لمن عمره 13 فأكثر، onChild لمن دونها.
 */
export default function AgeGate({ status, onPass, onChild }) {
  const [year, setYear] = useState('');

  if (status === 'child') {
    return (
      <p className="age-gate-child">
        الحساب لمن هم {MIN_ACCOUNT_AGE} سنة فما فوق. التطبيق يعمل كاملاً بدونه، وبياناتك محفوظة على جهازك.
      </p>
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
      <label className="account-form-lead" htmlFor="age-gate-year">ما سنة ميلادك؟</label>
      <select id="age-gate-year" className="account-form-input" value={year} onChange={(e) => setYear(e.target.value)}>
        <option value="">اختر السنة</option>
        {birthYears().map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button type="button" className="account-form-submit" disabled={!year} onClick={next}>
        التالي
      </button>
    </div>
  );
}
