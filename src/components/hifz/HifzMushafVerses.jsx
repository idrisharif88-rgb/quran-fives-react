import { useState, useRef, useLayoutEffect } from 'react';
import MushafPage from '../mushaf/MushafPage';
import { verseKeys, pagesOfRefs } from '../../utils/hifzRecordingRefs';
import '../mushaf/MushafReader.css';

/**
 * آيات الورد كما في المصحف المطبوع: أسطرها وحدها بعرض عمود الصفحة، كل كلمة في موضعها
 * من سطرها، وما في السطر من غيرها فارغ. ورد يمتدّ على صفحتين يُرسم جزآه متتاليين.
 * @param refs آيات الورد [{ s, a }]
 */
export default function HifzMushafVerses({ refs }) {
  const hostRef = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = hostRef.current;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const keys = verseKeys(refs);
  return (
    <div className="hifz-mushaf" ref={hostRef}>
      {width > 0 && pagesOfRefs(refs).map((page) => (
        <MushafPage key={page} page={page} width={width} highlightVerse={keys} onlyVerses />
      ))}
    </div>
  );
}
