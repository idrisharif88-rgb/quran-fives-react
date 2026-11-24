import usePullToRefresh, { PULL_TRIGGER } from '../../hooks/usePullToRefresh';
import './PullToRefresh.css';

/**
 * مؤشّر السحب للتحديث: دائرة خضراء تنزل مع الإصبع، سهمها يدور حتى حدّ الإطلاق، ثم تدور أثناء التحديث.
 * onRefresh يعيد وعداً: المزامنة وصلاحيات الحساب (runSyncCheck في App).
 */
export default function PullToRefresh({ enabled, onRefresh }) {
  const { pull, busy } = usePullToRefresh(enabled, onRefresh);
  if (!pull && !busy) return null;
  const ready = pull >= PULL_TRIGGER;
  const y = busy ? PULL_TRIGGER * 0.75 : pull * 0.75;
  return (
    <div className="pull-refresh" style={{ transform: `translate(-50%, ${y}px)` }} role="status" aria-live="polite">
      <span className={`pull-refresh-dot${busy ? ' is-busy' : ''}${ready ? ' is-ready' : ''}`}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          style={busy ? undefined : { transform: `rotate(${Math.min(1, pull / PULL_TRIGGER) * 300}deg)` }}>
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 4v5h-5" />
        </svg>
      </span>
      <span className="sr-only">{busy ? 'جارٍ التحديث' : ready ? 'أفلت للتحديث' : 'اسحب للتحديث'}</span>
    </div>
  );
}
