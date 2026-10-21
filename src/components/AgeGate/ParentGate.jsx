import { useState } from 'react';
import { latinDigits } from '../../utils/syncAccount';

// سؤال حساب لا يحلّه طفل صغير بسهولة (بوّابة وليّ الأمر في سياسة العائلات)
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const newQuestion = () => ({ a: randomInt(12, 19), b: randomInt(6, 9) });

/**
 * بوّابة وليّ الأمر: ضرب عددين قبل أن يُعاد سؤال العمر. الخطأ يبدّل السؤال.
 */
export default function ParentGate({ onPass, onCancel }) {
  const [q, setQ] = useState(newQuestion);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);

  const check = () => {
    if (Number(latinDigits(answer.trim())) === q.a * q.b) { onPass(); return; }
    setWrong(true);
    setAnswer('');
    setQ(newQuestion());
  };

  return (
    <div className="age-gate">
      <label className="account-form-lead" htmlFor="parent-gate-answer">لوليّ الأمر: كم حاصل {q.a} × {q.b}؟</label>
      <input
        id="parent-gate-answer"
        className="account-form-input"
        inputMode="numeric"
        dir="ltr"
        value={answer}
        onChange={(e) => { setAnswer(e.target.value); setWrong(false); }}
        autoComplete="off"
        maxLength={4}
      />
      {wrong && <p className="account-form-error" role="alert">إجابة غير صحيحة</p>}
      <button type="button" className="account-form-submit" disabled={!answer.trim()} onClick={check}>
        تأكيد
      </button>
      <button type="button" className="account-form-link" onClick={onCancel}>
        رجوع
      </button>
    </div>
  );
}
