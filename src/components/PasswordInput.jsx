import { useState } from 'react';

const EyeIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

/**
 * حقل كلمة السر مع زرّ إظهار/إخفاء: الحقل المخفي لا يكشف لوحة مفاتيح بلغة أخرى
 * ولا أرقاماً عربية بدل اللاتينية، فيُرفض الدخول وصاحبه لا يدري لماذا.
 * بقيّة الخصائص (value, onChange, placeholder, aria-label) تمرّ إلى الحقل كما هي.
 */
export default function PasswordInput(props) {
  const [shown, setShown] = useState(false);
  return (
    <div className="account-form-password">
      <input
        className="account-form-input"
        type={shown ? 'text' : 'password'}
        dir="ltr"
        autoComplete="new-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={128}
        {...props}
      />
      <button
        type="button"
        className="account-form-eye"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
        aria-pressed={shown}
      >
        <EyeIcon off={shown} />
      </button>
    </div>
  );
}
