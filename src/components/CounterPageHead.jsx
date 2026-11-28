import { pageOpening, pageOpeningVerse } from '../utils/pageOpening';
import './CounterPageHead.css';

// مطلع الصفحة الجارية فوق دائرة العدّاد: أول ثلاث كلمات منها، ثمّ رقم آيتها في علامة آية
export default function CounterPageHead({ page }) {
  const words = pageOpening(page);
  if (!words) return null;
  return (
    <p className="counter-page-head" dir="rtl">
      {words} <span className="counter-page-head-verse">﴿{pageOpeningVerse(page)}﴾</span>
    </p>
  );
}
