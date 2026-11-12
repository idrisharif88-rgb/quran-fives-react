import { SECTION } from '../../utils/appSection';
import './SectionChoice.css';

/**
 * بعد الدخول: الخماسيات أو الحفظ. يبقى الاختيار حتى تسجيل الخروج،
 * إلا لمن أذن له المشرف بالتنقّل (canSwitch): لا تحذير، وزرّ التنقّل في كل قسم.
 */
export default function SectionChoice({ onChoose, canSwitch = false }) {
  return (
    <div className="section-choice" dir="rtl" role="dialog" aria-modal="true" aria-label="اختر القسم">
      <div className="section-choice-inner">
        <h2>أهلاً بك</h2>
        <div className="section-choice-tiles">
          <button type="button" className="section-tile section-tile--fives" onClick={() => onChoose(SECTION.FIVES)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 6.5C10 5 7.5 4.5 3.5 4.5v14c4 0 6.5.5 8.5 2 2-1.5 4.5-2 8.5-2v-14c-4 0-6.5.5-8.5 2z" />
              <path d="M12 6.5v14" />
            </svg>
            <b>الخماسيات</b>
            <span>اقرأ وراجع</span>
          </button>
          <button type="button" className="section-tile section-tile--hifz" onClick={() => onChoose(SECTION.HIFZ)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20.5s-8.5-5-8.5-11A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.9c0 6-8.5 11-8.5 11z" />
            </svg>
            <b>الحفظ</b>
            <span>احفظ وسمّع</span>
          </button>
        </div>
        {!canSwitch && <p className="section-choice-note">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path className="section-choice-warn" d="M12 3 22.5 21h-21z" />
            <path className="section-choice-mark" d="M12 10v5.5M12 18v.2" />
          </svg>
          <span>يتوجب تسجيل خروج للتبديل بين "حفظ" و "خماسيات"</span>
        </p>}
      </div>
    </div>
  );
}
