import './HifzIconButton.css';

// زرّ برنامج الحفظ في صفّ الأيقونات: بحجمها وإطارها، ويتميّز باللون الذهبي
export default function HifzIconButton({ onClick, complete }) {
  return (
    <button type="button" className="action-icon hifz-icon" title="برنامج الحفظ" onClick={onClick}>
      <span>حفظ</span>
      {complete && <i className="hifz-icon-done" aria-label="اكتمل اليوم" />}
    </button>
  );
}
