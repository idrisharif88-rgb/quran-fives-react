// مؤشّر مزامنة صامت: لا يظهر إلا عند فشل الرفع/انقطاع الاتصال.
// يبقى ظاهراً حتى تنجح المزامنة، والضغط عليه يعيد المحاولة.
export default function SyncStatusIndicator({ failed, retrying, onRetry }) {
  if (!failed) return null;

  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={retrying}
      dir="rtl"
      aria-label="لم تتم مزامنة بياناتك، اضغط لإعادة المحاولة"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        insetInlineStart: '50%',
        transform: 'translateX(50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        borderRadius: '999px',
        border: '1px solid var(--app-danger)',
        background: 'var(--app-surface-2)',
        color: 'var(--app-danger)',
        fontSize: '13px',
        fontFamily: 'inherit',
        boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
        cursor: retrying ? 'default' : 'pointer',
        opacity: retrying ? 0.7 : 1,
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46A5.5 5.5 0 0 1 17.5 11v.5h.5a3 3 0 0 1 .79 5.9l1.45 1.45A5 5 0 0 0 19.35 10.04zM3 5.27l2.75 2.74A6.5 6.5 0 0 0 6 20h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6a4 4 0 0 1-.27-7.99c.07.42.18.83.34 1.22L7.73 10z"/>
      </svg>
      <span>{retrying ? 'جارٍ المزامنة…' : 'لم تتم المزامنة — إعادة المحاولة'}</span>
    </button>
  );
}
