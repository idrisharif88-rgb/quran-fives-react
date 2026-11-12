import { arabicNumber } from '../../utils/libraryText';
import { NextIcon } from './LibraryIcons';

// المصدر تحت النص: الطبعة المطبوعة، النص الرقمي، ورابط المجلد في مكتبة أهل البيت (ع) لمقابلة الصفحة
export default function LibrarySource({ passage }) {
  const { edition, digital, compareUrl, book, author, vol } = passage;
  return (
    <div className="library-source">
      <div className="library-source-row">
        <span className="library-source-key">الطبعة</span>
        <span>{edition || [book, author].filter(Boolean).join('، ')}</span>
      </div>
      <div className="library-source-row">
        <span className="library-source-key">النص الرقمي</span>
        <span dir="ltr">{digital || 'OpenITI'}</span>
      </div>
      {compareUrl && (
        <a className="library-source-link" href={compareUrl} target="_blank" rel="noopener noreferrer">
          <span>قابِل الصفحة في مكتبة أهل البيت (ع){vol ? ` · ج ${arabicNumber(vol)}` : ''}</span>
          <NextIcon />
        </a>
      )}
    </div>
  );
}
