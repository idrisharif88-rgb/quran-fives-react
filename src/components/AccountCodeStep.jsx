import { useState } from 'react';

/**
 * الخطوة الثانية: رمز التأكيد المُرسل إلى البريد — لتفعيل حساب جديد (verify)،
 * أو للدخول من جهاز جديد (login)، أو لاسترجاع كلمة السر (reset، ومعه الكلمة الجديدة).
 */
export default function AccountCodeStep({ auth }) {
  const { pending, busy, error, confirm, cancelPending, clearError } = auth;
  const [otp, setOtp] = useState('');
  const [code, setCode] = useState('');

  const isReset = pending.kind === 'reset';

  const submit = (e) => {
    e.preventDefault();
    if (!busy) confirm(otp, code);
  };

  return (
    <form className="account-form" dir="rtl" onSubmit={submit} noValidate>
      <p className="account-form-lead">
        {isReset ? 'إن كان هذا البريد مسجّلاً فقد أرسلنا إليه رمزاً من 6 أرقام:'
          : pending.kind === 'login' ? 'للدخول من هذا الجهاز أرسلنا رمزاً من 6 أرقام إلى:'
          : 'أرسلنا رمز تأكيد من 6 أرقام إلى:'}
        <span className="account-form-email" dir="ltr">{pending.user}</span>
      </p>

      <input
        className="account-form-input account-form-input--otp"
        type="text"
        inputMode="numeric"
        dir="ltr"
        value={otp}
        onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); clearError(); }}
        placeholder="رمز التأكيد"
        aria-label="رمز التأكيد"
        autoComplete="one-time-code"
        maxLength={6}
      />
      {isReset && (
        <input
          className="account-form-input"
          type="password"
          dir="ltr"
          value={code}
          onChange={(e) => { setCode(e.target.value); clearError(); }}
          placeholder="كلمة السر الجديدة"
          aria-label="كلمة السر الجديدة"
          autoComplete="new-password"
          maxLength={128}
        />
      )}

      <p className="account-form-hint">الرمز صالح 15 دقيقة. إن لم يصل فانظر في البريد غير المرغوب.</p>

      {error && <p className="account-form-error" role="alert">{error}</p>}

      <button type="submit" className="account-form-submit" disabled={busy || otp.length !== 6}>
        {busy ? 'لحظة…' : isReset ? 'غيّر كلمة السر وادخل' : 'أكّد وادخل'}
      </button>
      <button type="button" className="account-form-link" disabled={busy} onClick={cancelPending}>
        رجوع
      </button>
    </form>
  );
}
