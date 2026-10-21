import { useState } from 'react';
import PasswordInput from '../PasswordInput';
import useAccountDelete from '../../hooks/useAccountDelete';
import '../AccountForm.css';
import './AccountDelete.css';

/**
 * «احذف حسابي» في لوحة الحساب: رابط هادئ، ثم تأكيد بكلمة السر.
 * يحذف الحساب وبياناته وملفاته من الخادم، ثم من هذا الجهاز.
 */
export default function AccountDelete({ auth }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const { remove, busy, error, clearError } = useAccountDelete(auth);

  const close = () => { setOpen(false); setCode(''); clearError(); };

  if (!open) {
    return (
      <button type="button" className="account-delete-link" onClick={() => setOpen(true)}>
        احذف حسابي
      </button>
    );
  }

  return (
    <form className="manual-sync-confirm account-delete" onSubmit={(e) => { e.preventDefault(); remove(code); }}>
      <p className="manual-sync-confirm-text">
        يُحذف حسابك وكل بياناته من الخادم نهائياً: التقدّم والملاحظات والختمات والتسجيلات وملفات الإجازات. لا يمكن التراجع.
      </p>
      <p className="account-delete-note">
        نسخة جوجل درايف — إن كانت لك — تبقى في حسابك على جوجل، وتحذفها من إعدادات جوجل درايف.
      </p>
      <PasswordInput
        value={code}
        onChange={(e) => { setCode(e.target.value); clearError(); }}
        placeholder="كلمة السر للتأكيد"
        aria-label="كلمة السر للتأكيد"
        autoComplete="current-password"
      />
      {error && <p className="account-delete-error" role="alert">{error}</p>}
      <div className="manual-sync-confirm-actions">
        <button type="submit" className="khmasiyat-quiz-btn account-delete-confirm" disabled={busy}>
          {busy ? 'جارٍ الحذف…' : 'احذف نهائياً'}
        </button>
        <button type="button" className="khmasiyat-quiz-btn secondary" onClick={close} disabled={busy}>
          تراجع
        </button>
      </div>
    </form>
  );
}
