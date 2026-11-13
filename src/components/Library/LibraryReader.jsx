import { useEffect, useState } from 'react';
import { fetchLibraryPassage } from '../../utils/libraryApi';
import { placeLabel } from '../../utils/libraryText';
import { BackIcon, NextIcon } from './LibraryIcons';
import LibraryText from './LibraryText';
import LibraryStatus from './LibraryStatus';
import LibrarySource from './LibrarySource';

// قراءة المقطع كاملاً مع مسار الباب والمصدر، والتنقّل إلى السابق والتالي
export default function LibraryReader({ id, query, onBack }) {
  const [currentId, setCurrentId] = useState(id);
  const [passage, setPassage] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchLibraryPassage(currentId, ctrl.signal).then(setPassage, (e) => { if (e.name !== 'AbortError') setError(e.kind); });
    return () => ctrl.abort();
  }, [currentId, attempt]);

  const go = (target) => { if (target) { setPassage(null); setError(null); setCurrentId(target); } };
  const retry = () => { setError(null); setAttempt((n) => n + 1); };
  const ready = passage && passage.id === currentId;

  return (
    <div className="library-screen">
      <div className="library-top">
        <h2>{passage?.book || 'المكتبة'}</h2>
        <button type="button" className="library-icon" onClick={onBack} aria-label="رجوع إلى النتائج"><BackIcon /></button>
      </div>

      {error && <LibraryStatus kind={error} onRetry={retry} />}
      {!error && !ready && <p className="library-hint">جارٍ التحميل…</p>}

      {!error && ready && (
        <>
          {passage.chapterPath.length > 0 && (
            <div className="library-crumbs">
              {passage.chapterPath.map((t, i) => (
                i === passage.chapterPath.length - 1 ? <b key={i}>{t}</b> : <span key={i}>{t} ›</span>
              ))}
            </div>
          )}
          <div className="library-page-tag">{placeLabel(passage, true)}</div>
          <p className="library-body"><LibraryText text={passage.text} query={query} /></p>
          <LibrarySource passage={passage} />
        </>
      )}

      <div className="library-nav">
        <button type="button" className="library-icon" disabled={!ready || !passage.prevId} onClick={() => go(passage.prevId)} aria-label="السابق"><BackIcon /></button>
        <span>{ready ? placeLabel(passage) : ''}</span>
        <button type="button" className="library-icon" disabled={!ready || !passage.nextId} onClick={() => go(passage.nextId)} aria-label="التالي"><NextIcon /></button>
      </div>
    </div>
  );
}
