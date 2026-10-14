import { RECITERS } from '../../data/reciters';

/**
 * اختيار المقرئ بجانب زرّ التلاوة. الاختيار واحد في التطبيق كلّه (إعدادات الصوت) ويُحفظ.
 */
export default function HifzReciterSelect({ reciter, onChange }) {
  return (
    <select className="hifz-select" value={reciter} onChange={(e) => onChange(e.target.value)} aria-label="المقرئ">
      {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  );
}
