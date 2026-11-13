import { placeLabel } from '../../utils/libraryText';
import LibraryText from './LibraryText';

// نتيجة واحدة: الباب والموضع، ومقطع تُلوَّن فيه كلمات البحث
export default function LibraryHit({ hit, query, showBook = false, onOpen }) {
  return (
    <button type="button" className="library-hit" onClick={() => onOpen(hit.id)}>
      <span className="library-meta">
        {showBook && <span className="library-book">{hit.book}</span>}
        {hit.chapter && <span className="library-chap-inline">{hit.chapter}</span>}
        <span className="library-where">{placeLabel(hit)}</span>
      </span>
      <span className="library-snip"><LibraryText text={hit.snippet} query={query} /></span>
    </button>
  );
}
