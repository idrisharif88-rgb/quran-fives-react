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
 * Displays one or more Quran verses inside the styled verse-container.
 *
 * @param {object[]} verses        - Array of verse objects { s, a, t }
 * @param {number}  [cornerNumber] - When provided (khmasiyat mode only), renders
 *                                   a large, watermark-style number in the bottom-
 *                                   left corner of the card showing the five's last
 *                                   verse number.
 */
export default function TextDisplay({ verses, cornerNumber }) {
  return (
    <div className="verse-container">
      {cornerNumber != null && (
        <span className="verse-corner-number" aria-hidden="true">
          {cornerNumber}
        </span>
      )}
      {verses.map((verse) => (
        <Verse key={`${verse.s}-${verse.a}`} verse={verse} />
      ))}
    </div>
  );
}
