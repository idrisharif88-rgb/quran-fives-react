import './ConfirmDialog.css';

/**
 * سؤال تأكيد قبل عمل لا يُتراجع عنه: بطاقة وسط الشاشة فوق حاجب، بعنوان ونصّ وزرّين —
 * الشكل نفسه لتأكيد تصفير العدّاد والخروج من التطبيق.
 * يُرسم داخل الشاشة التي تسأل، فيعلو محتواها مهما كانت طبقتها.
 * زرّ الرجوع في الهاتف شأن صاحب السؤال: يغلقه كما يغلق onCancel.
 * @param confirmLabel نصّ زرّ التنفيذ (أحمر)
 */
export default function ConfirmDialog({ title, message, confirmLabel, cancelLabel = 'إلغاء', onConfirm, onCancel }) {
  return (
    <div className="confirm-dialog-scrim" dir="rtl" onClick={onCancel}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-btn danger" onClick={onConfirm}>{confirmLabel}</button>
          <button type="button" className="confirm-dialog-btn" onClick={onCancel}>{cancelLabel}</button>
        </div>
      </div>
    </div>
  );
}
