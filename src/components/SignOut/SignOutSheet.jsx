import ActionSheet from './ActionSheet';
import { FAILURE } from '../../utils/signOutFlow';
import { destinationName } from '../../utils/signOutSave';
import { GOOGLE_ENABLED } from '../../utils/googleDrive';

const NOTHING_DELETED = 'بياناتك كما هي على هذا الهاتف. لم يُمسح شيء.';
const when = (ts) => new Date(ts).toLocaleString('ar', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });

function Steps({ destination, wiping, switching }) {
  const steps = [
    { text: destination ? `حفظ بياناتك في ${destination}` : 'حفظ بياناتك', state: wiping ? 'done' : 'now' },
    { text: 'إزالة البيانات من هذا الهاتف', state: wiping ? 'now' : '' },
    { text: switching ? 'فتح صفحة الدخول' : 'إنهاء الجلسة', state: '' },
  ];
  return (
    <ul className="action-sheet-steps">
      {steps.map((s) => (
        <li key={s.text} className={s.state}><span className="action-sheet-step-icon" aria-hidden="true" />{s.text}</li>
      ))}
    </ul>
  );
}

function Failed({ flow, signOut, status }) {
  const { kind, cloudAt } = flow.failure;
  const stay = <button type="button" className="action-sheet-btn" onClick={signOut.back}>ابقَ في حسابك</button>;
  const withoutSaving = <button type="button" className="action-sheet-link" onClick={signOut.askDelete}>الخروج دون حفظ…</button>;
  const finishing = flow.switching ? 'تبديل الحساب' : 'تسجيل الخروج';

  if (kind === FAILURE.CONFLICT) {
    return (
      <>
        <h4>جهاز آخر حدّث حسابك</h4>
        <p>{cloudAt ? `في السحابة نسخة حُفظت ${when(cloudAt)} من جهاز آخر.` : 'في السحابة نسخة حفظها جهاز آخر.'} أيّ النسختين تبقى؟</p>
        <div className="action-sheet-actions">
          <button type="button" className="action-sheet-btn primary" onClick={signOut.keepDeviceCopy}>احفظ نسخة هذا الهاتف</button>
          <button type="button" className="action-sheet-btn" onClick={() => signOut.leaveWithoutSaving({ wipe: true })}>أبقِ نسخة السحابة</button>
          {stay}
        </div>
      </>
    );
  }

  if (kind === FAILURE.EXPIRED) {
    return (
      <>
        <h4>انتهت جلسة هذا الجهاز</h4>
        <div className="action-sheet-safe">{NOTHING_DELETED}</div>
        <p>لا يمكن حفظ بياناتك قبل الدخول من جديد، فتبقى على هذا الهاتف إلى أن تدخل.</p>
        <div className="action-sheet-actions">
          <button type="button" className="action-sheet-btn primary" onClick={() => signOut.leaveWithoutSaving({ wipe: false })}>اخرج وأبقِ البيانات</button>
          {stay}
        </div>
      </>
    );
  }

  if (kind === FAILURE.NO_DESTINATION) {
    const canLink = GOOGLE_ENABLED && status?.googleBackup;
    return (
      <>
        <h4>لا مكان تُحفظ فيه بياناتك بعد</h4>
        <div className="action-sheet-safe">{NOTHING_DELETED}</div>
        <p>{status?.approved === false ? 'حسابك بانتظار الموافقة' : 'تعذّر الحفظ في حسابك'}{canLink ? '، وجوجل درايف غير مربوط.' : '.'}</p>
        <div className="action-sheet-actions">
          {canLink && <button type="button" className="action-sheet-btn primary" onClick={signOut.linkDrive}>اربط جوجل درايف واحفظ</button>}
          {stay}
        </div>
        {withoutSaving}
      </>
    );
  }

  const offline = kind === FAILURE.OFFLINE;
  return (
    <>
      <h4>{offline ? 'لا يوجد اتصال بالإنترنت' : 'تعذّر الوصول إلى الخادم'}</h4>
      <div className="action-sheet-safe">{NOTHING_DELETED}</div>
      <p>{offline ? `اتصل بالإنترنت لنحفظها ثم نكمل ${finishing}.` : `حاول بعد قليل لنحفظها ثم نكمل ${finishing}.`}</p>
      <div className="action-sheet-actions">
        <button type="button" className="action-sheet-btn primary" onClick={signOut.start}>أعد المحاولة</button>
        {stay}
      </div>
      {withoutSaving}
    </>
  );
}

/**
 * خطوات الخروج وتبديل الحساب. الزرّ الأكبر لا يمحو شيئاً أبداً، والحذف على شاشة ثانية
 * تسمّي ما سيضيع. signOut هو ما يعيده useSignOut.
 */
export default function SignOutSheet({ signOut, status }) {
  const { flow } = signOut;
  if (flow.step === 'idle') return null;
  const destination = destinationName(status);
  const label = flow.switching ? 'تبديل الحساب' : 'تسجيل الخروج';
  const busy = flow.step === 'saving' || flow.step === 'wiping';

  return (
    <ActionSheet label={label} onDismiss={busy ? undefined : signOut.back}>
      {flow.step === 'confirm' && (
        <>
          <h4>{label}؟</h4>
          <p>سنحفظ بياناتك{destination ? ` في ${destination}` : ''} أولاً، ثم نزيلها من هذا الهاتف. تعود عند دخولك.</p>
          <div className="action-sheet-actions">
            <button type="button" className="action-sheet-btn primary" onClick={signOut.start}>{flow.switching ? 'احفظ وبدّل الحساب' : 'احفظ واخرج'}</button>
            <button type="button" className="action-sheet-btn" onClick={signOut.back}>إلغاء</button>
          </div>
        </>
      )}
      {busy && (
        <>
          <h4>لحظة من فضلك…</h4>
          <Steps destination={destination} wiping={flow.step === 'wiping'} switching={flow.switching} />
          {flow.step === 'saving' && <button type="button" className="action-sheet-btn" onClick={signOut.back}>إلغاء</button>}
        </>
      )}
      {flow.step === 'failed' && <Failed flow={flow} signOut={signOut} status={status} />}
      {flow.step === 'confirmDelete' && (
        <>
          <h4>الخروج دون حفظ؟</h4>
          <p>سيُحذف من هذا الهاتف ولا يمكن استرجاعه:</p>
          <ul className="action-sheet-losses">
            {flow.losses.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <div className="action-sheet-actions">
            <button type="button" className="action-sheet-btn" onClick={signOut.back}>رجوع</button>
            <button type="button" className="action-sheet-btn danger" onClick={() => signOut.leaveWithoutSaving({ wipe: true })}>احذف واخرج</button>
          </div>
        </>
      )}
    </ActionSheet>
  );
}
