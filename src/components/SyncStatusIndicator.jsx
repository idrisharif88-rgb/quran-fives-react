// مؤشّر مزامنة بلون التطبيق الأخضر الداكن وخطّه الموحّد.
// - أثناء الرفع: «جارٍ المزامنة…» مع دوّارة.
// - عند الفشل: مثلّث تحذير أصفر صغير بعلامة تعجّب خضراء داكنة،
//   يبقى ظاهراً والضغط عليه يعيد المحاولة.
// - عند النجاح والخمول: لا شيء.
export default function SyncStatusIndicator({ failed, syncing, onRetry }) {
  if (syncing) {
    return (
      <div className="sync-status-pill" dir="rtl" aria-label="جارٍ المزامنة">
        <span className="sync-status-spinner" aria-hidden="true"></span>
        <span>جارٍ المزامنة…</span>
      </div>
    );
  }

  if (!failed) return null;

  return (
    <button
      type="button"
      onClick={onRetry}
      aria-label="لم تتم المزامنة، اضغط لإعادة المحاولة"
      className="sync-status-warning"
    >
      <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
        <path
          d="M12 3 L22 20.4 H2 Z"
          fill="#f7c531"
          stroke="#f7c531"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <rect x="10.85" y="8.6" width="2.3" height="6.6" rx="1.15" fill="#006400" />
        <circle cx="12" cy="18" r="1.5" fill="#006400" />
      </svg>
    </button>
  );
}
