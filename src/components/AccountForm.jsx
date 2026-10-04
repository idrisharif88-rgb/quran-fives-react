import { useState } from 'react';
import { MIN_CODE_LENGTH } from '../utils/syncAccount';

/**
 * دخول أو طلب حساب جديد بالبريد. الحالة والشبكة في useAccount؛ هنا الحقول فقط.
 */
export default function AccountForm({ auth }) {
  const { busy, error, knownEmails, login, register, startReset, clearError, forgetKnownEmail } = auth;
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [user, setUser] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const isRegister = mode === 'register';

  const edit = (setter) => (e) => {
    setter(e.target.value);
    setMismatch(false);
    clearError();
  };

  const switchMode = (next) => {
    setMode(next);
    setConfirm('');
    setMismatch(false);
    clearError();
  };

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    if (!isRegister) { login({ user, code }); return; }
    if (code.trim() !== confirm.trim()) { setMismatch(true); return; }
    register({ name, user, code });
  };

  const message = mismatch ? 'كلمتا السر غير متطابقتين' : error;

  return (
    <form className="account-form" dir="rtl" onSubmit={submit} noValidate>
      <div className="account-form-tabs" role="tablist">
        {[['login', 'دخول'], ['register', 'حساب جديد']].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            className={`account-form-tab${mode === value ? ' is-active' : ''}`}
            onClick={() => switchMode(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {isRegister && (
        <input
          className="account-form-input"
          type="text"
          value={name}
          onChange={edit(setName)}
          placeholder="اسمك — نرحّب بك به"
          aria-label="الاسم"
          autoComplete="off"
          maxLength={40}
        />
      )}
      {/* type=text لا email: حساب أقدم قد يكون اسماً لا بريداً، والدخول به يبقى ممكناً.
          الملء التلقائي معطّل: المتصفّح كان يضع رقماً محفوظاً قديماً بدل رسالة الحقل. */}
      <input
        className="account-form-input"
        type="text"
        inputMode="email"
        dir="ltr"
        value={user}
        onChange={edit(setUser)}
        placeholder={isRegister ? 'سجّل ببريدك الإلكتروني' : 'ادخل ببريدك الإلكتروني'}
        aria-label="البريد الإلكتروني"
        name="quran-account-email"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={254}
      />
      {/* بُرُد دُخل بها على هذا الجهاز: ضغطة تملأ الحقل، و× تنسى البريد */}
      {!isRegister && knownEmails.length > 0 && (
        <div className="account-form-known" dir="ltr">
          {knownEmails.map((email) => (
            <span key={email} className={`account-form-known-item${user === email ? ' is-active' : ''}`}>
              <button type="button" className="account-form-known-pick" onClick={() => { setUser(email); clearError(); }}>
                {email}
              </button>
              <button type="button" className="account-form-known-forget" aria-label={`انسَ ${email}`} onClick={() => forgetKnownEmail(email)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className="account-form-input"
        type="password"
        dir="ltr"
        value={code}
        onChange={edit(setCode)}
        placeholder="كلمة السر"
        aria-label="كلمة السر"
        autoComplete="new-password"
        maxLength={128}
      />
      {isRegister && (
        <>
          <input
            className="account-form-input"
            type="password"
            dir="ltr"
            value={confirm}
            onChange={edit(setConfirm)}
            placeholder="أعد كتابة كلمة السر"
            aria-label="أعد كتابة كلمة السر"
            autoComplete="new-password"
            maxLength={128}
          />
          <p className="account-form-hint">
            كلمة السر {MIN_CODE_LENGTH} أحرف على الأقل. سنرسل رمز تأكيد إلى بريدك.
          </p>
        </>
      )}

      {message && <p className="account-form-error" role="alert">{message}</p>}

      <button type="submit" className="account-form-submit" disabled={busy}>
        {busy ? 'لحظة…' : isRegister ? 'أرسل رمز التأكيد' : 'دخول'}
      </button>

      {!isRegister && (
        <button type="button" className="account-form-link" disabled={busy} onClick={() => startReset(user)}>
          نسيت كلمة السر؟
        </button>
      )}
    </form>
  );
}
