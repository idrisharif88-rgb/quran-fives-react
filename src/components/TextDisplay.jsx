import { useState } from 'react';
import VerseNotesBack from './VerseNotesBack';
import './TextDisplay.css';

function Verse({ verse }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const words = verse.t.split(' ');
  const isLong = words.length > 7;

  const displayedText = isLong && !isExpanded
    ? words.slice(0, 7).join(' ') + ' ...'
    : verse.t;

  return (
    <span className="verse-text">
      {displayedText}
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="expand-btn"
          title={isExpanded ? 'عرض أقل' : 'عرض المزيد'}
        >
          {isExpanded ? '−' : '+'}
        </button>
      )}
    </span>
  );
}

/**
 * Displays one or more Quran verses inside a fixed two-layer card:
 *   verse-card  — outer shell (border, shadow, flex column). Never scrolls.
 *   verse-scroll — inner text area.  Scrolls only when text overflows.
 *
 * @param {object[]} verses        – Array of verse objects { s, a, t }
 * @param {number}  [cornerNumber] – Last verse number of the current khmasiyat
 *                                   (shown as a large number at the bottom-left).
 *                                   Only passed in khmasiyat mode.
 * @param {ReactNode} [cornerAction] – Navigation controls for the corner row. Rendered
 *                                   as a fragment so its children land directly in the
 *                                   row's grid: surah picker centre, step size right.
 * @param {object} [notesFlip]     – Enables the flip button (centre of the corner row,
 *                                   above the surah picker). The back of the card shows
 *                                   the user's note for each verse:
 *                                   { flipped, onFlip, notes, onSave, onImport }.
 */
export default function TextDisplay({ verses, cornerNumber, cornerAction, cardClassName = '', notesFlip }) {
  // The turn animation plays only after the user has flipped once, so the
  // card's mount fade-in is not replaced by a flip on first render.
  const [hasFlipped, setHasFlipped] = useState(false);
  const isBack = Boolean(notesFlip?.flipped);
  // The row also hosts the flip button, so it stays on the back with that button alone.
  const hasCornerRow = Boolean(notesFlip) || cornerNumber != null || cornerAction != null;
  const faceClass = hasFlipped ? (isBack ? 'is-back' : 'is-front') : '';

  return (
    <div className={`verse-card ${cardClassName} ${faceClass}`.trim()}>
      {isBack ? (
        <VerseNotesBack
          verses={verses}
          notes={notesFlip.notes}
          onSave={notesFlip.onSave}
          onImport={notesFlip.onImport}
        />
      ) : (
        <div className="verse-scroll">
          {verses.map((verse) => (
            <Verse key={`${verse.s}-${verse.a}`} verse={verse} />
          ))}
        </div>
      )}

      {/* dir=ltr so the grid columns read left→right: number | surah | step */}
      {hasCornerRow && (
        <div className="verse-corner-row" dir="ltr">
          {!isBack && (
            <div className="verse-corner-number" aria-hidden="true">
              {cornerNumber ?? ''}
            </div>
          )}
          {notesFlip && (
            <button
              type="button"
              className={`verse-flip-btn ${isBack ? 'active' : ''}`.trim()}
              onClick={() => { setHasFlipped(true); notesFlip.onFlip(); }}
              title={isBack ? 'عرض الآيات' : 'عرض الملاحظات'}
              aria-label={isBack ? 'عرض الآيات' : 'عرض الملاحظات'}
            >
              {/* الوجه: «i» للمعلومات. الظهر: دائرة خضراء داكنة مصمتة للرجوع إلى الآيات */}
              {isBack
                ? <span className="verse-flip-dot" aria-hidden="true" />
                : <span className="verse-flip-i" aria-hidden="true">i</span>}
            </button>
          )}
          {!isBack && cornerAction}
        </div>
      )}
    </div>
  );
}
