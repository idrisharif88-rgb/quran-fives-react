import { useState } from 'react';
import { REPEAT_MIN, REPEAT_MAX } from '../../utils/hifzSchedule';
import './HifzRepeatTarget.css';

const clamp = (n) => Math.min(REPEAT_MAX, Math.max(REPEAT_MIN, n));
// أرقام لوحة المفاتيح العربية تُقبل كاللاتينية
const latin = (text) => text.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf));

/**
 * عدد التكرار: خانة تُكتب فيها من 1 إلى 100، وتُعتمد عند الخروج منها أو «تم».
 * اللمس يُفرغها للكتابة (العدد الحالي يظهر باهتاً) بدل تحديد النصّ: التحديد يُظهر في أندرويد
 * مقبضَي النسخ فوق لوحة المفاتيح. تُترك فارغة فيبقى العدد كما كان.
 */
export default function HifzRepeatTarget({ value, onChange }) {
  const [draft, setDraft] = useState(null);   // نصّ يُكتب الآن؛ null = يُعرض العدد المحفوظ

  const commit = () => {
    if (draft === null || draft === '') { setDraft(null); return; }
    const n = parseInt(latin(draft), 10);
    setDraft(null);
    if (Number.isInteger(n)) onChange(clamp(n));
  };

  return (
    <div className="hifz-repeat-target">
      <input
        type="text"
        inputMode="numeric"
        className="hifz-repeat-target-input"
        value={draft ?? String(value)}
        placeholder={String(value)}
        onChange={(e) => setDraft(e.target.value.slice(0, 3))}
        onFocus={() => setDraft('')}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        aria-label={`عدد التكرار من ${REPEAT_MIN} إلى ${REPEAT_MAX}`}
        title="عدد التكرار"
        dir="ltr"
      />
    </div>
  );
}
