import { useState } from 'react';

const latin = (text) => text.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf));

// خانة رقم تُكتب، وتُعتمد عند الخروج منها أو «تم»
function NumberBox({ value, min, max, pad, label, onCommit }) {
  const [draft, setDraft] = useState(null);
  const shown = pad ? String(value).padStart(2, '0') : String(value);
  const commit = () => {
    if (draft === null) return;
    const n = parseInt(latin(draft), 10);
    setDraft(null);
    if (Number.isInteger(n) && n >= min && n <= max) onCommit(n);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      className="hifz-reminder-num"
      value={draft ?? shown}
      onChange={(e) => setDraft(e.target.value.slice(0, 2))}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      aria-label={label}
      dir="ltr"
    />
  );
}

/**
 * وقت التذكير: الساعة (1–12) والدقائق (00–59) خانتان تُكتبان، وص/م زرّان.
 * @param minutes دقائق منذ منتصف الليل
 */
export default function HifzReminderTime({ minutes, onChange }) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const pm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const set = (hour12, minute, isPm) => onChange(((hour12 % 12) + (isPm ? 12 : 0)) * 60 + minute);

  return (
    <div className="hifz-reminder-time" dir="ltr">
      <NumberBox value={h12} min={1} max={12} label="الساعة" onCommit={(h) => set(h, m, pm)} />
      <span className="hifz-reminder-colon">:</span>
      <NumberBox value={m} min={0} max={59} pad label="الدقائق" onCommit={(mm) => set(h12, mm, pm)} />
      <div className="hifz-reminder-ampm" role="radiogroup" aria-label="صباحاً أو مساءً" dir="rtl">
        <button type="button" role="radio" aria-checked={!pm} className={!pm ? 'on' : ''} onClick={() => set(h12, m, false)}>ص</button>
        <button type="button" role="radio" aria-checked={pm} className={pm ? 'on' : ''} onClick={() => set(h12, m, true)}>م</button>
      </div>
    </div>
  );
}
