import { useState } from 'react';
import { shareNotesText, shareNotesPdf } from '../../utils/notebookShare';

export const SHARE_ICON = 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z';

/**
 * شريط المشاركة أسفل الدفتر: تحديد الكل، ثم نصّ أو PDF لما اختير.
 * @param selected الملاحظات المختارة بترتيب العرض
 */
export default function NotebookShareBar({ selected, allSelected, onToggleAll, onCancel }) {
  const [busy, setBusy] = useState(false);
  const none = selected.length === 0;

  const run = async (share) => {
    if (none || busy) return;
    setBusy(true);
    try {
      await share(selected);
    } catch (e) {
      alert('تعذّرت المشاركة: ' + (e?.message || ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="notebook-share-bar">
      <div className="notebook-share-row">
        <button type="button" className="notebook-done-toggle" onClick={onToggleAll}>
          {allSelected ? 'إلغاء الكل' : 'الكل'}
        </button>
        <span className="notebook-share-count">{selected.length} مختارة</span>
        <button type="button" className="notebook-done-toggle" onClick={onCancel}>إلغاء</button>
      </div>
      <div className="notebook-share-row">
        <button type="button" className="notebook-btn" disabled={none || busy} onClick={() => run(shareNotesText)}>نصّ</button>
        <button type="button" className="notebook-btn primary" disabled={none || busy} onClick={() => run(shareNotesPdf)}>
          {busy ? '…' : 'PDF'}
        </button>
      </div>
    </div>
  );
}
