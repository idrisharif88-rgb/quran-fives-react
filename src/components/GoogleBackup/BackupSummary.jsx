import './BackupSummary.css';

const clock = (ms) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
const date = (day) => {
  const parsed = new Date(`${day}T00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString('ar', { day: 'numeric', month: 'long', year: 'numeric' });
};

function Group({ title, rows }) {
  const shown = rows.filter(([, value]) => value);
  if (!shown.length) return null;
  return (
    <div className="backup-summary-group">
      <h4>{title}</h4>
      {shown.map(([label, value]) => (
        <div className="backup-summary-row" key={label}><span>{label}</span><strong>{value}</strong></div>
      ))}
    </div>
  );
}

/** ما في النسخة: جملة واحدة، ثم العدّاد، فالحفظ، فالباقي. ما لا شيء فيه لا يظهر. */
export default function BackupSummary({ summary }) {
  if (summary.isEmpty) {
    return <p className="backup-summary-warn" role="status">هذه النسخة فارغة: لا عدّاد ولا حفظ ولا تسجيلات. استرجاعها لا يعيد شيئاً.</p>;
  }
  const { counter, hifz, recordings } = summary;
  return (
    <div className="backup-summary">
      <p className="backup-summary-sentence">{summary.sentence}</p>
      <Group title="العدّاد" rows={[
        ['الصفحة الحالية', counter.page],
        ['بطاقات الأجزاء', counter.cards],
        ['أسرع جزء', counter.bestJuzMs ? clock(counter.bestJuzMs) : null],
      ]} />
      {hifz && (
        <Group title="الحفظ" rows={[
          ['الآيات المحفوظة', hifz.verses || 'لم يبدأ بعد'],
          ['وصلت إلى', hifz.reached],
          ['ورد اليوم', `${hifz.versesPerDay} ${hifz.versesPerDay === 1 ? 'آية' : 'آيات'}`],
          ['البداية', hifz.startedOn ? date(hifz.startedOn) : null],
        ]} />
      )}
      <Group title="وأيضاً" rows={[
        ['تسجيلات الحفظ', recordings.hifz],
        ['تسجيلات المراجعة', recordings.review],
        ['التفسير والملاحظات', summary.notes],
        ['المثبّتات', summary.stars],
        ['الختمات', summary.khatmas],
        ['الإجازات', summary.ijazat],
        ['الاختبارات المحفوظة', summary.quizzes],
      ]} />
    </div>
  );
}

/** قبل الاسترجاع: ما على الهاتف وما في النسخة جنباً إلى جنب */
export function RestoreCompare({ device, backup }) {
  const rows = [
    ['العدّاد', (s) => (s.counter.page ? `صفحة ${s.counter.page}` : '—')],
    ['الآيات المحفوظة', (s) => s.hifz?.verses ?? 0],
    ['التسجيلات', (s) => s.recordings.hifz + s.recordings.review],
    ['التفسير', (s) => s.notes],
  ];
  return (
    <table className="backup-compare">
      <thead><tr><th aria-label="البيان" /><th>هذا الهاتف</th><th>النسخة</th></tr></thead>
      <tbody>
        {rows.map(([label, read]) => <tr key={label}><td>{label}</td><td>{read(device)}</td><td>{read(backup)}</td></tr>)}
      </tbody>
    </table>
  );
}
