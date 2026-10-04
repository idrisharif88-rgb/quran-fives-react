import AccountForm from './AccountForm';
import AccountCodeStep from './AccountCodeStep';
import './AccountForm.css';

/**
 * واجهة الحساب للمستخدم غير الداخل: النموذج، ثم خطوة الرمز إن كانت عملية معلّقة.
 * auth هو ما يعيده useAccount. تُعرض في لوحة المزامنة وفي قفل «ختماتي».
 */
export default function AccountPanel({ auth }) {
  return auth.pending ? <AccountCodeStep auth={auth} /> : <AccountForm auth={auth} />;
}
