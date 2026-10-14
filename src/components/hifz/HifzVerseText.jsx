import { useState } from 'react';
import HifzMushafVerses from './HifzMushafVerses';

/**
 * ورد اليوم فوق الخطوات، بأسطره كما في المصحف المطبوع. يُغطّى حين يُقرأ من الحفظ:
 *   خطوة التكرار — مغطّى دائماً.
 *   أثناء التسجيل وطريقة الخماسيات — مغطّى، ولصاحبه أن يُظهره إن احتاج ثم يخفيه.
 * @param refs      آيات الورد [{ s, a }]
 * @param multi     الورد أكثر من آية (لصيغة الرسالة)
 * @param repeat    خطوة التكرار مفتوحة
 * @param cover     'recording' | 'method' | null — يُعاد تركيب المكوّن مع كل تغطية (key) فيبدأ مغطّى
 */
export default function HifzVerseText({ refs, multi, repeat, cover }) {
  const [peek, setPeek] = useState(false);
  const what = multi ? 'الآيات' : 'الآية';

  if (repeat) return <p className="hifz-verse hidden">{what} مخفية — كرّرها من حفظك</p>;
  const verses = <div className="hifz-verse mushaf"><HifzMushafVerses refs={refs} /></div>;
  if (!cover) return verses;
  if (!peek) {
    return (
      <p className="hifz-verse hidden">
        {cover === 'recording' ? `${what} مخفية أثناء التسجيل — اقرأ من حفظك` : `${what} مخفية — كرّرها من حفظك`}
        <button type="button" className="hifz-link hifz-verse-toggle" onClick={() => setPeek(true)}>إظهار {what}</button>
      </p>
    );
  }
  return (
    <>
      {verses}
      <button type="button" className="hifz-link hifz-verse-toggle shown" onClick={() => setPeek(false)}>إخفاء {what}</button>
    </>
  );
}
