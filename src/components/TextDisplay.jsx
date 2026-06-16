import { useState } from 'react';
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
 */
export default function TextDisplay({ verses, cornerNumber, cardClassName = '' }) {
  return (
    <div className={`verse-card ${cardClassName}`.trim()}>
      <div className="verse-scroll">
        {verses.map((verse) => (
          <Verse key={`${verse.s}-${verse.a}`} verse={verse} />
        ))}
      </div>

      {cornerNumber != null && (
        <div className="verse-corner-number" dir="ltr" aria-hidden="true">
          {cornerNumber}
        </div>
      )}
    </div>
  );
}
