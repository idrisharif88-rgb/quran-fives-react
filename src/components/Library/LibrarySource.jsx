import { arabicNumber } from '../../utils/libraryText';
import { NextIcon } from './LibraryIcons';

// المصدر تحت النص: الكتاب والناشر، النص الرقمي (OpenITI)، ورابط المجلد في مكتبة أهل البيت (ع)
export default function LibrarySource({ passage }) {
  const { edition, digital, compareUrl, book, author, vol } = passage;
  return (
    <div className="library-source">
      <div className="library-source-row">
        <span className="library-source-key">المصدر</span>
        <span>{edition || [book, author].filter(Boolean).join('، ')}</span>
      </div>
      <div className="library-source-row">
        <span className="library-source-key">النص الرقمي</span>
        <span dir="ltr">{digital || 'OpenITI'}</span>
      </div>
      {compareUrl && (
        <a className="library-source-link" href={compareUrl} target="_blank" rel="noopener noreferrer">
          <span>مكتبة أهل البيت (ع){vol ? ` · الجزء ${arabicNumber(vol)}` : ''}</span>
          <NextIcon />
        </a>
      )}
    </div>
  );
}
