import './ActionSheet.css';

/** ورقة من أسفل الشاشة فوق حاجب. الضغط على الحاجب يغلق إن مُرّر onDismiss. */
export default function ActionSheet({ label, onDismiss, children }) {
  return (
    <div className="action-sheet-scrim" dir="rtl" onClick={onDismiss}>
      <div className="action-sheet" role="alertdialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
