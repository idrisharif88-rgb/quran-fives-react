import './AccountBadge.css';

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2.2c-3.6 0-8 1.8-8 4.6V21h16v-2.2c0-2.8-4.4-4.6-8-4.6z" />
  </svg>
);

// مثلّث فشل المزامنة نفسه الذي في SyncStatusIndicator
const WarningIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M12 3 L22 20.4 H2 Z" fill="#f7c531" stroke="#f7c531" strokeWidth="2.4" strokeLinejoin="round" />
    <rect x="10.85" y="8.6" width="2.3" height="6.6" rx="1.15" style={{ fill: 'var(--app-accent-deep)' }} />
    <circle cx="12" cy="18" r="1.5" style={{ fill: 'var(--app-accent-deep)' }} />
  </svg>
);

/**
 * شارة الحساب على الشاشة الرئيسية: تُظهر للمستخدم اسمه كاملاً فيعرف أنّه داخل، وتبقى
 * حتى يسجّل الخروج. الضغط عليها يفتح لوحة المزامنة (وفيها تسجيل الخروج).
 *
 * وهي تحمل حالة المزامنة في خانة أيقونتها: الاسم الطويل يمدّ الشارة إلى وسط الشاشة حيث
 * مؤشّر المزامنة العائم (sync-status-*) فيغطّي الاسم — فيُخفى المؤشّر ما دامت ظاهرة.
 * عند الفشل الضغطُ يعيد المحاولة، كما كان يفعل المثلّث.
 */
export default function AccountBadge({ account, onOpen, syncing = false, failed = false, onRetry }) {
  if (!account) return null;
  const retry = failed && !syncing;
  return (
    <button
      type="button"
      className="account-badge"
      dir="rtl"
      onClick={retry ? onRetry : onOpen}
      aria-label={retry ? 'لم تتم المزامنة، اضغط لإعادة المحاولة' : syncing ? 'جارٍ المزامنة' : 'حسابك — افتح المزامنة'}
    >
      {syncing ? <span className="account-badge-spinner" aria-hidden="true" /> : retry ? <WarningIcon /> : <PersonIcon />}
      <span className="account-badge-name">{account.name || account.user}</span>
    </button>
  );
}
