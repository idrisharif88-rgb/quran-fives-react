import ConfirmDialog from '../ConfirmDialog';

const CONFIRM = {
  reset: { title: 'إعادة ضبط البرنامج', message: 'يُمحى تقدّم الحفظ كله وتبدأ من جديد. هل أنت متأكد؟', yes: 'إعادة الضبط' },
  cancel: { title: 'إلغاء جلسة اليوم', message: 'تُلغى خطوات ورد اليوم وتبدأ من أوّلها. ما حفظته وتسجيلاتك تبقى. هل أنت متأكد؟', yes: 'إلغاء الجلسة' },
};

/**
 * أسفل شاشة الحفظ: إعدادات الحفظ، إلغاء جلسة اليوم، إعادة ضبط البرنامج.
 * الإلغاء وإعادة الضبط يسألان أوّلاً بنافذة تأكيد.
 * @param confirming  السؤال المفتوح: 'reset' | 'cancel' | null (في الشاشة، ليغلقه زرّ الرجوع)
 * @param canCancel   لورد اليوم خطوات بدأت ولم تكتمل
 */
export default function HifzFooter({ confirming, onConfirming, canCancel, onReset, onCancel, settingsOpen, onToggleSettings }) {
  const run = confirming === 'reset' ? onReset : onCancel;
  return (
    <div className="hifz-footer">
      <button type="button" className="hifz-link" onClick={onToggleSettings} aria-expanded={settingsOpen}>إعدادات الحفظ</button>
      {canCancel && <button type="button" className="hifz-link" onClick={() => onConfirming('cancel')}>إلغاء جلسة اليوم</button>}
      <button type="button" className="hifz-link" onClick={() => onConfirming('reset')}>إعادة ضبط البرنامج</button>
      {confirming && (
        <ConfirmDialog
          title={CONFIRM[confirming].title}
          message={CONFIRM[confirming].message}
          confirmLabel={CONFIRM[confirming].yes}
          cancelLabel="تراجع"
          onConfirm={() => { run(); onConfirming(null); }}
          onCancel={() => onConfirming(null)}
        />
      )}
    </div>
  );
}
