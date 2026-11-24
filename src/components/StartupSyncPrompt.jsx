import ModalDialog from './ModalDialog';
import './StartupSyncPrompt.css';

/**
 * سؤال واحد بقي من أسئلة المزامنة (البقيّة صارت تلقائية في autoSync.js): تبديل المستخدم —
 * على الجهاز بيانات حساب آخر وسحابة الحساب الداخل فارغة. لا تُرفع بيانات غيره إلى حسابه بلا
 * سؤال: إمّا يرفعها، أو يبدأ فارغاً (onFresh).
 */
export default function StartupSyncPrompt({ busy, error, onPush, onFresh, onLater }) {
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
