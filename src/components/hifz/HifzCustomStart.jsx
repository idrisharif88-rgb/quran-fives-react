import { useState } from 'react';
import { SURAH_METADATA } from '../../data/quranConstants';
import { DIRECTIONS, indexOfVerse } from '../../utils/hifzSchedule';

/**
 * بدء الحفظ من آية يختارها المستخدم — لمن أذن له المشرف فقط.
 * الحفظ يمضي منها إلى آخر المصحف ثم يعود إلى أوّله حتى يُختم.
 * @param onStart (origin) فهرس الآية المختارة في ترتيب الحفظ
 */
export default function HifzCustomStart({ onStart }) {
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState('1');
  const verseCount = SURAH_METADATA[surah - 1].verseCount;
  const origin = indexOfVerse(DIRECTIONS.FORWARD, surah, Number(ayah));

  return (
    <div className="hifz-start-option hifz-start-custom">
      <strong>من آية محدّدة</strong>
      <span>بإذن المشرف — يمضي الحفظ منها إلى آخر المصحف ثم يعود إلى أوّله</span>
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
      <span>{origin === null ? `رقم الآية من 1 إلى ${verseCount}` : `آيات السورة: ${verseCount}`}</span>
      <button type="button" className="hifz-btn primary" disabled={origin === null} onClick={() => onStart(origin)}>
        ابدأ من هنا
      </button>
    </div>
  );
}
