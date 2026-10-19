import { useState } from 'react';
import { SURAH_METADATA } from '../../data/quranConstants';
import { DIRECTIONS, indexOfVerse } from '../../utils/hifzSchedule';

// اتجاه الحفظ بسهمين كما يُقلَّب المصحف: الناس إلى اليسار، والفاتحة إلى اليمين
const ARROWS = [
  { direction: DIRECTIONS.FORWARD, label: 'نحو الناس', path: 'M19 12H5m0 0 6.5-6.5M5 12l6.5 6.5' },
  { direction: DIRECTIONS.BACKWARD, label: 'نحو الفاتحة', path: 'M5 12h14m0 0-6.5-6.5M19 12l-6.5 6.5' },
];

/**
 * بدء الحفظ من آية يختارها المستخدم — لمن أذن له المشرف فقط.
 * الحفظ يمضي منها في الاتجاه المختار (نحو الناس أو نحو الفاتحة، وآيات كل سورة بترتيبها)
 * إلى طرف المصحف ثم يلتفّ إلى الطرف الآخر حتى يُختم.
 * @param onStart (origin, direction) فهرس الآية المختارة في ترتيب الحفظ لذلك الاتجاه
 */
export default function HifzCustomStart({ onStart }) {
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState('1');
  const [direction, setDirection] = useState(DIRECTIONS.FORWARD);
  const verseCount = SURAH_METADATA[surah - 1].verseCount;
  const origin = indexOfVerse(direction, surah, Number(ayah));

  return (
    <div className="hifz-start-option hifz-start-custom">
      <strong>من آية محدّدة</strong>
      <span>بإذن المشرف — يمضي الحفظ منها في الاتجاه المختار حتى يُختم المصحف</span>
      <div className="hifz-start-custom-row">
        <select
          className="hifz-start-field"
          value={surah}
          onChange={(e) => { setSurah(Number(e.target.value)); setAyah('1'); }}
          aria-label="السورة"
        >
          {SURAH_METADATA.map((s) => <option key={s.id} value={s.id}>{s.id}. {s.name}</option>)}
        </select>
        <input
          className="hifz-start-field hifz-start-ayah"
          type="number"
          inputMode="numeric"
          min={1}
          max={verseCount}
          value={ayah}
          onChange={(e) => setAyah(e.target.value)}
          aria-label="رقم الآية"
        />
      </div>
      <div className="hifz-start-arrows" dir="ltr" role="radiogroup" aria-label="اتجاه الحفظ">
        {ARROWS.map((arrow) => (
          <button
            key={arrow.direction}
            type="button"
            role="radio"
            aria-checked={direction === arrow.direction}
            aria-label={arrow.label}
            title={arrow.label}
            className={`hifz-start-arrow ${direction === arrow.direction ? 'active' : ''}`.trim()}
            onClick={() => setDirection(arrow.direction)}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={arrow.path} /></svg>
          </button>
        ))}
      </div>
      <span>{origin === null ? `رقم الآية من 1 إلى ${verseCount}` : `آيات السورة: ${verseCount}`}</span>
      <button type="button" className="hifz-btn primary" disabled={origin === null} onClick={() => onStart(origin, direction)}>
        ابدأ من هنا
      </button>
    </div>
  );
}
