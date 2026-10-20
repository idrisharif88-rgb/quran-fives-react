/**
 * حساب داخل لكنّه ينتظر موافقة المشرف: المزامنة موقوفة والتطبيق يعمل محلياً.
 * googleOnly: حساب أوقف المشرف مزامنته مع السيرفر ومنحه نسخ جوجل درايف — بياناته في درايفه وحده.
 * (الأنماط في AccountForm.css، يحمّلها AccountPanel.)
 */
export default function AccountPending({ onRecheck, googleOnly = false }) {
  if (googleOnly) {
    return (
      <div className="account-pending" dir="rtl">
        <p className="account-pending-title">النسخ عبر جوجل درايف</p>
        <p className="account-form-hint">
          بياناتك وتسجيلاتك تُحفظ في جوجل درايف الخاص بك كل يوم، وتسترجعها من الزرّ بالأسفل.
        </p>
      </div>
    );
  }
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
