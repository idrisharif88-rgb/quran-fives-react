import './SectionSwitchIcon.css';

// أيقونتا القسمين كما في بلاطتي SectionChoice بعد الدخول
const ICONS = {
  fives: <path d="M12 6.5C10 5 7.5 4.5 3.5 4.5v14c4 0 6.5.5 8.5 2 2-1.5 4.5-2 8.5-2v-14c-4 0-6.5.5-8.5 2zM12 6.5v14" />,
  hifz: <path d="M12 20.5s-8.5-5-8.5-11A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.9c0 6-8.5 11-8.5 11z" />,
};
const LABEL = { fives: 'الخماسيات', hifz: 'الحفظ' };

/**
 * الانتقال إلى القسم الآخر — لمن أذن له المشرف (sectionSwitch).
 * to='fives': في رئيسية الحفظ، كبيرة في الوسط مع اسمها.
 * to='hifz': في صفّ أزرار الخماسيات، دائرة .action-icon كأخواتها فتأخذ مقاسها نفسه
 * (styles/upperActions.css)، بلون بلاطة الحفظ.
 */
export default function SectionSwitchIcon({ to, onClick }) {
  const icon = <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[to]}</svg>;
  if (to === 'hifz') {
    return (
      <button type="button" className="action-icon section-switch-action" onClick={onClick} aria-label={`انتقل إلى ${LABEL[to]}`} title={LABEL[to]}>
        {icon}
      </button>
    );
  }
  return (
    <button type="button" className="section-switch" onClick={onClick} aria-label={`انتقل إلى ${LABEL[to]}`} title={LABEL[to]}>
      <span className="section-switch-icon">{icon}</span>
      <b>{LABEL[to]}</b>
    </button>
  );
}
