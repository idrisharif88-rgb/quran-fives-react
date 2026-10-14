// زرّ سرعة التشغيل: يعرض السرعة الحالية ويبدّلها بضغطة (1× ← 1.25× ← 1.5× ← 2×)
export default function PlaybackRateButton({ rate, onCycle }) {
  return (
    <button type="button" className="hifz-rate-btn" onClick={onCycle} aria-label={`سرعة التشغيل ${rate}×`} title="سرعة التشغيل">
      <bdi dir="ltr">{rate}×</bdi>
    </button>
  );
}
