import { useState } from 'react';

function Verse({ verse, showVerseNumber = true }) {
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
          title={isExpanded ? "عرض أقل" : "عرض المزيد"}
        >
          {isExpanded ? '−' : '+'}
        </button>
      )}
      {showVerseNumber && (
        <span className="verse-number">
          ({verse.a})
        </span>
      )}
    </span>
  );
}

export default function TextDisplay({ verses, hideVerseNumber = false }) {
  return (
    <div className="verse-container">
      {verses.map((verse) => (
        <Verse key={`${verse.s}-${verse.a}`} verse={verse} showVerseNumber={!hideVerseNumber} />
      ))}
    </div>
  );
}
