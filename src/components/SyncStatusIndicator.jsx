import { useEffect, useState } from 'react';

const FAILURE_MESSAGE_MS = 3000;

// مؤشّر مزامنة احترافي بلون التطبيق الأخضر الداكن وخطّه الموحّد.
// - أثناء الرفع: «جارٍ المزامنة…» مع دوّارة.
// - عند الفشل: «لم تتم المزامنة» ثلاث ثوانٍ، ثم ينكمش إلى زر دائري
//   يبقى ظاهراً لإعادة المحاولة يدوياً عند عودة الاتصال.
// - عند النجاح والخمول: لا شيء.
export default function SyncStatusIndicator({ failed, syncing, onRetry }) {
  const [isMessageShown, setIsMessageShown] = useState(false);
  const [prevFailed, setPrevFailed] = useState(false);

  // ضبط الحالة عند تغيّر الخاصيّة: كل فشل جديد يُظهر الرسالة من جديد
  if (failed !== prevFailed) {
    setPrevFailed(failed);
    setIsMessageShown(failed);
  }

  useEffect(() => {
    if (!isMessageShown) return;
    const timer = setTimeout(() => setIsMessageShown(false), FAILURE_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [isMessageShown]);

  if (!syncing && !failed) return null;

  const isSyncing = Boolean(syncing);
  const isCompact = !isSyncing && !isMessageShown;

  return (
    <button
      type="button"
      onClick={isSyncing ? undefined : onRetry}
      disabled={isSyncing}
      dir="rtl"
      aria-label={isSyncing ? 'جارٍ المزامنة' : 'لم تتم المزامنة، اضغط لإعادة المحاولة'}
      className={isCompact ? 'sync-status-pill sync-status-pill--compact' : 'sync-status-pill'}
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
          {!isCompact && <span>لم تتم المزامنة — إعادة المحاولة</span>}
        </>
      )}
    </button>
  );
}
