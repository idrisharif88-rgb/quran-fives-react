import { useCallback, useState } from 'react';
import { SYNC_ENABLED } from '../utils/syncConfig';
import {
  readAccount, saveAccount, clearAccount, validateName, validateEmail, validateCode,
  readKnownEmails, rememberEmail, forgetEmail, markWelcome,
} from '../utils/syncAccount';
import { registerAccount, verifyAccount, loginAccount, confirmLogin, requestReset, confirmReset } from '../utils/cloudSync';

// رسالة لكل ردّ من الخادم؛ ما عداها عطل شبكة
const ERROR_BY_STATUS = {
  400: 'البريد أو كلمة السر غير صالحة',
  401: 'البريد أو كلمة السر غير صحيحة',
  403: 'اكتمل عدد المستخدمين حالياً — حاول لاحقاً',
  409: 'هذا البريد مسجّل — ادخل به أو استرجع كلمة السر',
  429: 'محاولات كثيرة — حاول بعد قليل',
  503: 'تعذّر إرسال البريد — حاول لاحقاً',
};
const BAD_OTP = 'رمز التأكيد غير صحيح أو منتهي الصلاحية';

/**
 * حساب المستخدم: دخول واحد يفتح المزامنة وسجلّ الختمات.
 * account = { user, code, device?, name? } أو null. name يُعرض ترحيباً بعد الدخول. البيانات المحلية لا تُمسّ عند الخروج.
 * pending = خطوة تنتظر رمزاً من البريد: { kind: 'verify' | 'login' | 'reset', user, code? }.
 * الدخول من جهاز جديد بخطوتين دائماً: كلمة السر ثم رمز البريد.
 */
export default function useAccount() {
  const [account, setAccount] = useState(readAccount);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [knownEmails, setKnownEmails] = useState(readKnownEmails);   // بُرُد دُخل بها على هذا الجهاز

  // ينفّذ طلباً ويترجم فشله إلى رسالة؛ يعيد ردّ الخادم عند النجاح و null عند الفشل
  const run = useCallback(async (request, otpStep = false) => {
    if (!SYNC_ENABLED) { setError('المزامنة غير مهيّأة في هذه النسخة'); return null; }
    setBusy(true);
    setError('');
    try {
      return (await request()) || {};
    } catch (e) {
      setError(otpStep && e?.status === 400 ? BAD_OTP : ERROR_BY_STATUS[e?.status] || 'تعذّر الاتصال بالخادم');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const enter = useCallback((creds) => {
    saveAccount(creds);
    // الحسابات الأقدم (اسم لا بريد) لا تُحفظ في قائمة البُرُد
    if (validateEmail(creds.user) === null) setKnownEmails(rememberEmail(creds.user));
    markWelcome(creds.user);
    setAccount(creds);
    setPending(null);
  }, []);

  const forgetKnownEmail = useCallback((email) => setKnownEmails(forgetEmail(email)), []);

  const login = useCallback(async ({ user, code }) => {
    const creds = { user: user.trim(), code: code.trim() };
    if (!creds.user || !creds.code) { setError('أدخل البريد وكلمة السر'); return; }
    const result = await run(() => loginAccount(creds));
    if (!result) return;
    if (result.pending) setPending({ kind: 'login', ...creds });   // رمز أُرسل إلى البريد
    else enter({ ...creds, name: result.name });
  }, [run, enter]);

  // حساب جديد، الخطوة 1: يُرسل رمز التأكيد إلى البريد
  const register = useCallback(async ({ name, user, code }) => {
    const creds = { user: user.trim().toLowerCase(), code: code.trim() };
    const displayName = name.trim();
    const invalid = validateName(displayName) || validateEmail(creds.user) || validateCode(creds.code);
    if (invalid) { setError(invalid); return; }
    if (await run(() => registerAccount({ ...creds, name: displayName }))) setPending({ kind: 'verify', ...creds });
  }, [run]);

  // نسيت كلمة السر، الخطوة 1
  const startReset = useCallback(async (user) => {
    const email = user.trim().toLowerCase();
    const invalid = validateEmail(email);
    if (invalid) { setError(invalid); return; }
    if (await run(() => requestReset(email))) setPending({ kind: 'reset', user: email });
  }, [run]);

  // الخطوة 2: الرمز المُرسل (ومعه الكلمة الجديدة عند الاسترجاع). نجاحها يوثّق الجهاز.
  const confirm = useCallback(async (otp, newCode = '') => {
    if (!pending) return;
    const { kind, user } = pending;
    const code = kind === 'reset' ? newCode.trim() : pending.code;
    if (kind === 'reset') {
      const invalid = validateCode(code);
      if (invalid) { setError(invalid); return; }
    }
    const digits = otp.trim();
    const request = {
      verify: () => verifyAccount(user, digits),
      login: () => confirmLogin({ user, code }, digits),
      reset: () => confirmReset(user, digits, code),
    }[kind];
    const result = await run(request, true);
    if (result) enter({ user, code, device: result.device, name: result.name });
  }, [pending, run, enter]);

  const cancelPending = useCallback(() => { setPending(null); setError(''); }, []);

  const signOut = useCallback(() => {
    clearAccount();
    setAccount(null);
    setPending(null);
    setError('');
  }, []);

  const clearError = useCallback(() => setError(''), []);

  return {
    account, pending, busy, error, knownEmails,
    login, register, startReset, confirm, cancelPending, signOut, clearError, forgetKnownEmail,
  };
}
