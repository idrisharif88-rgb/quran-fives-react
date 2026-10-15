import { pageOpening } from '../utils/pageOpening';
import './CounterPageHead.css';

// مطلع الصفحة الجارية فوق دائرة العدّاد: أول ثلاث كلمات منها
export default function CounterPageHead({ page }) {
  const words = pageOpening(page);
  if (!words) return null;
  return <p className="counter-page-head" dir="rtl">{words}</p>;
}
