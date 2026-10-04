import ModalDialog from './ModalDialog';
import useAdminUsers from '../hooks/useAdminUsers';
import './AdminUsersSheet.css';

/**
 * لوحة المشرف: الحسابات المسجّلة، والموافقة على الجديد منها ليبدأ المزامنة.
 * إيقاف حساب يوقف مزامنته فقط؛ بياناته على الخادم وعلى جهازه تبقى.
 */
export default function AdminUsersSheet({ onClose, formatTime }) {
  const { users, error, busyUser, setApproval } = useAdminUsers();
  const waiting = users ? users.filter(u => !u.approved).length : 0;
  // المنتظرون أوّلاً
  const sorted = users ? [...users].sort((a, b) => Number(a.approved) - Number(b.approved)) : [];

  return (
    <ModalDialog title="المستخدمون" onClose={onClose} className="admin-users">
      {users && (
        <p className="admin-users-summary">
          {users.length} حساب{waiting > 0 ? ` — ${waiting} بانتظار موافقتك` : ' — لا أحد ينتظر'}
        </p>
      )}
      {error && <p className="admin-users-error" role="alert">{error}</p>}
      {!users && !error && <p className="admin-users-summary">جارٍ التحميل…</p>}

      <ul className="admin-users-list">
        {sorted.map(u => (
          <li key={u.user} className={`admin-users-row${u.approved ? '' : ' is-waiting'}`}>
            <div className="admin-users-who">
              <span className="admin-users-name">{u.name}{u.admin ? ' (أنت — المشرف)' : ''}</span>
              <span className="admin-users-email" dir="ltr">{u.user}</span>
              <span className="admin-users-date">سجّل: {formatTime(u.createdAt)}</span>
            </div>
            {!u.admin && (
              <button
                type="button"
                className={`admin-users-btn${u.approved ? ' admin-users-btn--stop' : ''}`}
                disabled={busyUser === u.user}
                onClick={() => setApproval(u.user, !u.approved)}
              >
                {busyUser === u.user ? '…' : u.approved ? 'أوقف' : 'وافق'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </ModalDialog>
  );
}
