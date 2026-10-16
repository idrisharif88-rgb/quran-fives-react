import { useState } from 'react';
import { REPEAT_MIN, REPEAT_MAX } from '../../utils/hifzSchedule';
import './HifzRepeatTarget.css';

const clamp = (n) => Math.min(REPEAT_MAX, Math.max(REPEAT_MIN, n));
// أرقام لوحة المفاتيح العربية تُقبل كاللاتينية
const latin = (text) => text.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf));

/**
 * عدد التكرار: − [العدد] + ، من 1 إلى 100. الكتابة تُعتمد عند الخروج من الخانة أو «تم».
 */
export default function HifzRepeatTarget({ value, onChange }) {
  const [draft, setDraft] = useState(null);   // نصّ يُكتب الآن؛ null = يُعرض العدد المحفوظ

  const commit = () => {
    if (draft === null) return;
    const n = parseInt(latin(draft), 10);
    setDraft(null);
    if (Number.isInteger(n)) onChange(clamp(n));
  };

  return (
    <div className="hifz-repeat-target">
      <span className="hifz-repeat-target-label">عدد التكرار</span>
      <button type="button" className="hifz-repeat-target-step" onClick={() => onChange(clamp(value - 1))} disabled={value <= REPEAT_MIN} aria-label="إنقاص عدد التكرار">−</button>
      <input
        type="text"
        inputMode="numeric"
        className="hifz-repeat-target-input"
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value.slice(0, 3))}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        aria-label={`عدد التكرار من ${REPEAT_MIN} إلى ${REPEAT_MAX}`}
        dir="ltr"
      />
      <button type="button" className="hifz-repeat-target-step" onClick={() => onChange(clamp(value + 1))} disabled={value >= REPEAT_MAX} aria-label="زيادة عدد التكرار">+</button>
    </div>
  );
}
