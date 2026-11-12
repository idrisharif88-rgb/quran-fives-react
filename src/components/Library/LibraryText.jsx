import { Fragment } from 'react';
import { highlightParts } from '../../utils/libraryText';

// النص مع تلوين كلمات البحث، وما بين [ ] (زيادة المحقق) بلون خافت
export default function LibraryText({ text, query = '' }) {
  return text.split(/(\[[^\]]*\])/).map((chunk, i) => {
    if (/^\[[^\]]*\]$/.test(chunk)) return <span key={i} className="library-editor">{chunk}</span>;
    return (
      <Fragment key={i}>
        {highlightParts(chunk, query).map((p, j) => (p.hit ? <mark key={j}>{p.text}</mark> : p.text))}
      </Fragment>
    );
  });
}
