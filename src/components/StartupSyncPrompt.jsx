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
 *
 * emptyCloud: حالة تبديل المستخدم — على الجهاز بيانات حساب آخر وسحابة الحساب الداخل
 * فارغة. لا تُرفع بيانات غيره إلى حسابه بلا سؤال: إمّا يرفعها، أو يبدأ فارغاً (onFresh).
 */
export default function StartupSyncPrompt({
  remoteUpdatedAt,
  localUpdatedAt,
  emptyCloud = false,
  busy,          // 'pull' | 'push' | null
  error,
  formatTime,
  onPull,
  onPush,
  onFresh,
  onLater,
}) {
  if (emptyCloud) {
    return (
      <ModalDialog title="بيانات حساب آخر" size="sm" dismissible={false} className="startup-sync">
        <p className="startup-sync-lead">
          على هذا الجهاز بيانات حساب آخر، وحسابك في السحابة فارغ. اختر ما تفعل بها —
          لن يُطبَّق شيء قبل اختيارك.
        </p>
        {error && <p className="startup-sync-error">{error}</p>}
        <div className="startup-sync-actions">
          <button type="button" className="startup-sync-btn startup-sync-btn--pull" onClick={onFresh} disabled={Boolean(busy)}>
            ابدأ حسابي فارغاً
          </button>
          <button type="button" className="startup-sync-btn startup-sync-btn--push" onClick={onPush} disabled={Boolean(busy)}>
            {busy === 'push' ? 'جارٍ الرفع…' : 'انسخ بيانات هذا الجهاز إلى حسابي'}
          </button>
          <button type="button" className="startup-sync-btn startup-sync-btn--later" onClick={onLater} disabled={Boolean(busy)}>
            لاحقاً — لا تزامن الآن
          </button>
        </div>
        <p className="startup-sync-note">«ابدأ فارغاً» يمسح البيانات من هذا الجهاز فقط؛ نسخة الحساب الآخر في سحابته تبقى.</p>
      </ModalDialog>
    );
  }

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
