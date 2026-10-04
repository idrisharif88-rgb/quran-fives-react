import './AccountBadge.css';

/**
 * شارة الحساب على الشاشة الرئيسية: تُظهر للمستخدم باسمه أنّه داخل، وتبقى حتى
 * يسجّل الخروج. الضغط عليها يفتح لوحة المزامنة (وفيها تسجيل الخروج).
 */
const MAX_NAME_CHARS = 13;

// الاسم كاملاً إن وسعه الحدّ، وإلا أوّل 13 حرفاً (Array.from: لا يُقطع حرف مركّب)
function shortName(name) {
  const chars = Array.from(name);
  return chars.length > MAX_NAME_CHARS ? `${chars.slice(0, MAX_NAME_CHARS).join('')}…` : name;
}

export default function AccountBadge({ account, onOpen }) {
  if (!account) return null;
  return (
    <button type="button" className="account-badge" dir="rtl" onClick={onOpen} aria-label="حسابك — افتح المزامنة">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
        <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2.2c-3.6 0-8 1.8-8 4.6V21h16v-2.2c0-2.8-4.4-4.6-8-4.6z" />
      </svg>
      <span className="account-badge-name">{shortName(account.name || account.user)}</span>
    </button>
  );
}
