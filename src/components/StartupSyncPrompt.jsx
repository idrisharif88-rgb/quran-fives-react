import ModalDialog from './ModalDialog';
import './StartupSyncPrompt.css';

/**
 * قرار المزامنة عند فتح التطبيق.
 *
 * قبلها كان التطبيق يسحب نسخة السحابة ويكتبها فوق المحلية ويعيد التحميل تلقائياً
 * بمجرّد اختلاف الطابع الزمني — بلا سؤال. هنا الاختلاف يُعرض فقط، ولا شيء
 * يُطبَّق حتى يضغط المستخدم زراً. وما دام لم يقرّر يبقى الرفع التلقائي موقوفاً
 * (cloudSyncReadyRef = false) عملاً بقاعدة «لا رفع قبل سحب متحقّق منه».
 *
 * الزرّان يستعملان forcePullRemote/forcePushLocal، وكلاهما يقرأ طابع الخادم
 * الحالي ويجعله أساس الكتابة — فلا تعارض 409 ولا حاجة إلى تعديل الخادم.
 */
export default function StartupSyncPrompt({
  remoteUpdatedAt,
  localUpdatedAt,
  busy,          // 'pull' | 'push' | null
  error,
  formatTime,
  onPull,
  onPush,
  onLater,
}) {
  return (
    <ModalDialog title="نسختان مختلفتان" size="sm" dismissible={false} className="startup-sync">
      <p className="startup-sync-lead">
        النسخة المحفوظة في السحابة تختلف عن نسخة هذا الجهاز. اختر أيّهما تُبقي —
        لن يُطبَّق شيء قبل اختيارك.
      </p>

      <div className="startup-sync-rows">
        <div className="startup-sync-row">
          <span className="startup-sync-row-label">السحابة</span>
          <span className="startup-sync-row-time">{formatTime(remoteUpdatedAt)}</span>
        </div>
        <div className="startup-sync-row">
          <span className="startup-sync-row-label">هذا الجهاز</span>
          <span className="startup-sync-row-time">
            {localUpdatedAt ? formatTime(localUpdatedAt) : 'لم يزامن بعد'}
          </span>
        </div>
      </div>

      <p className="startup-sync-note">الخيار الذي تختاره يحلّ محلّ الآخر.</p>

      {error && <p className="startup-sync-error">{error}</p>}

      <div className="startup-sync-actions">
        <button
          type="button"
          className="startup-sync-btn startup-sync-btn--pull"
          onClick={onPull}
          disabled={Boolean(busy)}
        >
          {busy === 'pull' ? 'جارٍ التنزيل…' : 'نزّل نسخة السحابة'}
        </button>
        <button
          type="button"
          className="startup-sync-btn startup-sync-btn--push"
          onClick={onPush}
          disabled={Boolean(busy)}
        >
          {busy === 'push' ? 'جارٍ الرفع…' : 'أبقِ نسخة هذا الجهاز وارفعها'}
        </button>
        <button
          type="button"
          className="startup-sync-btn startup-sync-btn--later"
          onClick={onLater}
          disabled={Boolean(busy)}
        >
          لاحقاً — لا تزامن الآن
        </button>
      </div>
    </ModalDialog>
  );
}
