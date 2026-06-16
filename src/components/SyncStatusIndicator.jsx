// مؤشّر مزامنة احترافي بلون التطبيق الأخضر الداكن وخطّه الموحّد.
// - أثناء الرفع: «جارٍ المزامنة…» مع دوّارة.
// - عند الفشل: «لم تتم المزامنة» قابل للضغط لإعادة المحاولة.
// - عند النجاح والخمول: لا شيء.
export default function SyncStatusIndicator({ failed, syncing, onRetry }) {
  if (!syncing && !failed) return null;

  const isSyncing = Boolean(syncing);

  return (
    <button
      type="button"
      onClick={isSyncing ? undefined : onRetry}
      disabled={isSyncing}
      dir="rtl"
      aria-label={isSyncing ? 'جارٍ المزامنة' : 'لم تتم المزامنة، اضغط لإعادة المحاولة'}
      className="sync-status-pill"
    >
      {isSyncing ? (
        <>
          <span className="sync-status-spinner" aria-hidden="true"></span>
          <span>جارٍ المزامنة…</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>لم تتم المزامنة — إعادة المحاولة</span>
        </>
      )}
    </button>
  );
}
