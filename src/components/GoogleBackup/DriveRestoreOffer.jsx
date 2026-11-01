import { useEffect, useState } from 'react';
import ActionSheet from '../SignOut/ActionSheet';
import { GOOGLE_ENABLED } from '../../utils/googleDrive';
import { restoreBackup, driveOfferSeen, markDriveOfferSeen } from '../../utils/googleBackup';
import { APP_STORAGE_KEY, loadStoredState } from '../../utils/persistence';
import { isPristineState } from '../../utils/deviceData';

/**
 * حساب يعتمد على جوجل درايف وحده، دخل على هاتف فارغ: تُعرض عليه نسخته مرة واحدة.
 * من له نسخة على الخادم تعود إليه وحدها عند الدخول، فلا يُسأل.
 */
export default function DriveRestoreOffer({ status, user, backRef }) {
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const show = GOOGLE_ENABLED && user && !dismissed && status?.googleBackup && status.approved === false
    && !driveOfferSeen(user) && isPristineState(loadStoredState(APP_STORAGE_KEY));

  const dismiss = () => {
    markDriveOfferSeen(user);
    setDismissed(true);
  };

  useEffect(() => {
    if (!show) return undefined;
    backRef.current = () => { if (!busy) dismiss(); };
    return () => { backRef.current = null; };
  });

  if (!show) return null;

  const restore = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (await restoreBackup()) {
        markDriveOfferSeen(user);
        window.location.reload();
        return;
      }
      setMessage('لا نسخة في جوجل درايف لهذا الحساب.');
    } catch {
      setMessage(navigator.onLine === false ? 'لا اتصال بالإنترنت.' : 'تعذّر الاتصال بجوجل.');
    }
    setBusy(false);
  };

  return (
    <ActionSheet label="استرجاع نسخة جوجل درايف" onDismiss={busy ? undefined : dismiss}>
      <h4>هل لك نسخة في جوجل درايف؟</h4>
      <p>اختر حساب جوجل الذي حفظت فيه، فنعيد بياناتك إلى هذا الهاتف.</p>
      {message && <p role="status">{message}</p>}
      <div className="action-sheet-actions">
        <button type="button" className="action-sheet-btn primary" disabled={busy} onClick={restore}>{busy ? 'جارٍ الاسترجاع…' : 'استرجع بياناتي'}</button>
        <button type="button" className="action-sheet-btn" disabled={busy} onClick={dismiss}>ابدأ فارغاً</button>
      </div>
    </ActionSheet>
  );
}
