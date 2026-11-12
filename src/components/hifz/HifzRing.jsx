/**
 * حلقة تقدّم: مسار رمادي وفوقه قوس بقدر value من total. المحتوى (children) في وسطها.
 * الحجم من CSS للعنصر الحاوي؛ الرسم يملؤه. لا قوس عند الصفر (طرفه المستدير يرسم نقطة).
 */
export default function HifzRing({ value, total, stroke = 9, children }) {
  const share = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  const r = 60 - stroke / 2 - 1;
  return (
    <span className="hifz-ring">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="hifz-ring-track" cx="60" cy="60" r={r} fill="none" strokeWidth={stroke} />
        {share > 0 && <circle className="hifz-ring-fill" cx="60" cy="60" r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" pathLength="100" strokeDasharray={`${share * 100} 100`} />}
      </svg>
      <span className="hifz-ring-mid">{children}</span>
    </span>
  );
}
