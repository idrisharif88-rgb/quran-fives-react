/**
 * حساب داخل لكنّه ينتظر موافقة المشرف: المزامنة موقوفة والتطبيق يعمل محلياً.
 * (الأنماط في AccountForm.css، يحمّلها AccountPanel.)
 */
export default function AccountPending({ onRecheck }) {
  return (
    <div className="account-pending" dir="rtl">
      <p className="account-pending-title">بانتظار موافقة المشرف</p>
      <p className="account-form-hint">
        حسابك جاهز، وتبدأ المزامنة حين يوافق عليه المشرف. التطبيق يعمل على هذا الجهاز كالمعتاد.
      </p>
      <button type="button" className="account-form-link" onClick={onRecheck}>تحقّق الآن</button>
    </div>
  );
}
