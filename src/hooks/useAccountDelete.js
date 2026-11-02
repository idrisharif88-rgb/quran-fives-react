import { useCallback, useState } from 'react';
import { deleteAccount } from '../utils/cloudSync';
import { forgetEmail, latinDigits } from '../utils/syncAccount';
import { wipeDeviceData } from '../utils/deviceData';
import { removeStoredState } from '../utils/persistence';
import { holdsPassword } from '../utils/webSession';
import { clearWebAccountFiles } from '../utils/webFileWipe';

// حذوف ملفات معلّقة تخصّ الحساب المحذوف: لا معنى لإعادة محاولتها تحت حساب آخر
const PENDING_DELETE_KEYS = ['quran-fives-ijaza-deletes-v1', 'quran-fives-hifz-deletes-v1'];

const ERROR_BY_STATUS = {
  400: 'هذا الحساب لا يُحذف من التطبيق',
  401: 'كلمة السر غير صحيحة',
  429: 'محاولات كثيرة — حاول بعد قليل',
};

/**
 * حذف الحساب من الخادم نهائياً (شرط جوجل بلاي). يطلب كلمة السر مجدّداً، ثم يمسح
 * بيانات الحساب من الجهاز كما في تسجيل الخروج ويعيد التحميل.
 * auth هو ما يعيده useAccount.
 */
export default function useAccountDelete(auth) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const remove = useCallback(async (typed) => {
    const { account } = auth;
    if (!account || busy) return;
    const clean = typed.trim();
    if (!clean) { setError('أدخل كلمة السر'); return; }
    // الكلمة كما حُفظت عند الدخول: قد تُكتب بأرقام عربية.
    // المتصفح لا يحفظ الكلمة ليقارن بها: تُجرَّب كما كُتبت ثم بأرقام لاتينية
    const latin = latinDigits(clean);
    const code = !holdsPassword() || clean === account.code ? clean : latin;
    setBusy(true);
    setError('');
    try {
      await deleteAccount({ ...account, code }).catch((e) => {
        if (holdsPassword() || e?.status !== 401 || latin === code) throw e;
        return deleteAccount({ ...account, code: latin });
      });
      await clearWebAccountFiles({ everything: true });
    } catch (e) {
      setError(ERROR_BY_STATUS[e?.status] || 'تعذّر الاتصال بالخادم — الحذف يحتاج إنترنت');
      setBusy(false);
      return;
    }
    wipeDeviceData();
    PENDING_DELETE_KEYS.forEach(removeStoredState);
    forgetEmail(account.user);
    auth.signOut();
    window.location.reload();
  }, [auth, busy]);

  const clearError = useCallback(() => setError(''), []);

  return { remove, busy, error, clearError };
}
