import usePageNavSettings from '../../hooks/usePageNavSettings';
import './PageNavSettings.css';

const ROWS = [
  ['longPress', 'الضغط المطوّل', 'يسار الشاشة: التالي — يمينها: السابق'],
  ['volume', 'أزرار الصوت', 'خفض: التالي — رفع: السابق (لا تعمل أثناء التلاوة)'],
];

/** مفتاحا التنقّل بين الصفحات، داخل «إعدادات الصوت». */
export default function PageNavSettings() {
  const settings = usePageNavSettings();
  return (
    <div className="page-nav-settings">
      <div className="page-nav-settings-title">التنقّل بين الصفحات</div>
      {ROWS.map(([key, label, hint]) => (
        <label key={key} className="page-nav-row">
          <span className="page-nav-text">
            <b>{label}</b>
            <small>{hint}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="page-nav-switch"
            checked={settings[key]}
            onChange={() => settings.toggle(key)}
          />
        </label>
      ))}
    </div>
  );
}
