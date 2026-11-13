import { OfflineIcon } from './LibraryIcons';

const MESSAGES = {
  offline: ['البحث في المكتبة يحتاج إنترنت', 'باقي التطبيق يعمل كالمعتاد.'],
  signin: ['سجّل الدخول لتبحث في المكتبة', 'من «المزامنة السحابية» في القائمة.'],
  pending: ['حسابك بانتظار الموافقة', 'تفتح المكتبة بعد موافقة المشرف.'],
  locked: ['المكتبة غير مفعّلة لحسابك', 'يفتحها المشرف من «إدارة المستخدمين».'],
  unavailable: ['المكتبة غير متوفرة الآن', 'حاول بعد قليل.'],
  error: ['تعذّر البحث', 'حاول مرة أخرى.'],
};

export default function LibraryStatus({ kind, onRetry }) {
  const [title, hint] = MESSAGES[kind] || MESSAGES.error;
  const canRetry = !['signin', 'pending', 'locked'].includes(kind);
  return (
    <div className="library-status">
      {kind === 'offline' && <OfflineIcon />}
      <b>{title}</b>
      <span>{hint}</span>
      {canRetry && <button type="button" className="library-retry" onClick={onRetry}>أعد المحاولة</button>}
    </div>
  );
}
