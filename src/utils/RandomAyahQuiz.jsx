import { useState, useEffect } from 'react';
import { QURAN_VERSES } from '../data/quranVerses';
import { buildShuffledIndices } from './quizUtils';
import { RANDOM_AYAH_QUIZ_STORAGE_KEY, loadStoredState, saveStoredState } from './persistence';

export default function RandomAyahQuiz({ onClose }) {
  const [persistedQuizState] = useState(() => loadStoredState(RANDOM_AYAH_QUIZ_STORAGE_KEY) || {});
  const [randomAyahIndex, setRandomAyahIndex] = useState(() => (
    Number.isInteger(persistedQuizState.randomAyahIndex) ? persistedQuizState.randomAyahIndex : null
  ));
  const [randomAyahSurahGuess, setRandomAyahSurahGuess] = useState(() => (
    typeof persistedQuizState.randomAyahSurahGuess === 'string' ? persistedQuizState.randomAyahSurahGuess : ''
  ));
  const [randomAyahVerseGuess, setRandomAyahVerseGuess] = useState(() => (
    typeof persistedQuizState.randomAyahVerseGuess === 'string' ? persistedQuizState.randomAyahVerseGuess : ''
  ));
  const [randomAyahRangeStart, setRandomAyahRangeStart] = useState(() => (
    typeof persistedQuizState.randomAyahRangeStart === 'string' ? persistedQuizState.randomAyahRangeStart : '1'
  ));
  const [randomAyahRangeEnd, setRandomAyahRangeEnd] = useState(() => (
    typeof persistedQuizState.randomAyahRangeEnd === 'string' ? persistedQuizState.randomAyahRangeEnd : String(QURAN_VERSES.length)
  ));
  const [randomAyahOrder, setRandomAyahOrder] = useState(() => (
    Array.isArray(persistedQuizState.randomAyahOrder) ? persistedQuizState.randomAyahOrder : []
  ));
  const [randomAyahNextPointer, setRandomAyahNextPointer] = useState(() => (
    Number.isInteger(persistedQuizState.randomAyahNextPointer) ? persistedQuizState.randomAyahNextPointer : 0
  ));
  const [randomAyahOrderRange, setRandomAyahOrderRange] = useState(() => {
    const { randomAyahOrderRange } = persistedQuizState;
    if (randomAyahOrderRange && Number.isInteger(randomAyahOrderRange.start) && Number.isInteger(randomAyahOrderRange.end)) {
      return randomAyahOrderRange;
    }
    return { start: 1, end: QURAN_VERSES.length };
  });
  const [randomAyahResult, setRandomAyahResult] = useState(() => (
    typeof persistedQuizState.randomAyahResult === 'string' ? persistedQuizState.randomAyahResult : ''
  ));

  const createRandomAyahQuestion = (forceNewCycle = false) => {
    const start = Number(randomAyahRangeStart);
    const end = Number(randomAyahRangeEnd);
    const maxVerses = QURAN_VERSES.length;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > maxVerses || start > end) {
      setRandomAyahIndex(null);
      setRandomAyahResult(`المدى غير صحيح. أدخل من 1 إلى ${maxVerses} بحيث البداية أقل من أو تساوي النهاية.`);
      return;
    }

    const rangeChanged = randomAyahOrderRange.start !== start || randomAyahOrderRange.end !== end;
    const needsNewCycle = forceNewCycle || rangeChanged || randomAyahOrder.length === 0 || randomAyahNextPointer >= randomAyahOrder.length;

    if (needsNewCycle) {
      const newOrder = buildShuffledIndices(start, end);
      const firstIndex = newOrder[0] ?? null;
      setRandomAyahOrder(newOrder);
      setRandomAyahNextPointer(firstIndex === null ? 0 : 1);
      setRandomAyahOrderRange({ start, end });
      setRandomAyahIndex(firstIndex);
    } else {
      setRandomAyahIndex(randomAyahOrder[randomAyahNextPointer]);
      setRandomAyahNextPointer(prev => prev + 1);
    }

    setRandomAyahSurahGuess('');
    setRandomAyahVerseGuess('');
    setRandomAyahResult('');
  };

  useEffect(() => {
    if (randomAyahOrder.length > 0 || randomAyahIndex !== null) return;
    createRandomAyahQuestion(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [randomAyahIndex, randomAyahOrder.length]);

  useEffect(() => {
    saveStoredState(RANDOM_AYAH_QUIZ_STORAGE_KEY, {
      randomAyahIndex,
      randomAyahSurahGuess,
      randomAyahVerseGuess,
      randomAyahRangeStart,
      randomAyahRangeEnd,
      randomAyahOrder,
      randomAyahNextPointer,
      randomAyahOrderRange,
      randomAyahResult,
    });
  }, [
    randomAyahIndex,
    randomAyahNextPointer,
    randomAyahOrder,
    randomAyahOrderRange,
    randomAyahRangeEnd,
    randomAyahRangeStart,
    randomAyahResult,
    randomAyahSurahGuess,
    randomAyahVerseGuess,
  ]);

  const checkRandomAyahAnswer = () => {
    if (randomAyahIndex === null) {
      setRandomAyahResult('لا يوجد سؤال حالي. اختر المدى ثم اضغط "تطبيق".');
      return;
    }
    const guessedSurah = Number(randomAyahSurahGuess);
    const guessedVerse = Number(randomAyahVerseGuess);
    if (!Number.isInteger(guessedSurah) || !Number.isInteger(guessedVerse)) {
      setRandomAyahResult('يرجى إدخال رقم السورة ورقم الآية.');
      return;
    }

    const randomAyahData = QURAN_VERSES[randomAyahIndex];
    const correctSurah = randomAyahData?.s ?? 0;
    const correctVerse = randomAyahData?.a ?? 0;
    
    if (guessedSurah === correctSurah && guessedVerse === correctVerse) {
      setRandomAyahResult('إجابة صحيحة');
      setTimeout(() => {
        createRandomAyahQuestion();
      }, 200);
    } else {
      setRandomAyahResult(`غير صحيح. السورة: ${correctSurah} | الآية: ${correctVerse}`);
    }
  };

  const randomAyahData = randomAyahIndex !== null ? QURAN_VERSES[randomAyahIndex] : null;
  const randomAyahRemainingCount = Math.max(0, randomAyahOrder.length - randomAyahNextPointer);

  return (
    <div className="khmasiyat-quiz-panel" dir="rtl">
      <h2 className="khmasiyat-quiz-title">اختبار آيات عشوائي</h2>
      <div className="khmasiyat-quiz-range">
        <span className="khmasiyat-range-label">من</span>
        <input
          type="number"
          className="khmasiyat-quiz-input khmasiyat-range-input"
          value={randomAyahRangeStart}
          onChange={(e) => setRandomAyahRangeStart(e.target.value)}
          placeholder="1"
          min="1"
          max={QURAN_VERSES.length}
          aria-label="من"
        />
        <span className="khmasiyat-range-label">إلى</span>
        <input
          type="number"
          className="khmasiyat-quiz-input khmasiyat-range-input"
          value={randomAyahRangeEnd}
          onChange={(e) => setRandomAyahRangeEnd(e.target.value)}
          placeholder={String(QURAN_VERSES.length)}
          min="1"
          max={QURAN_VERSES.length}
          aria-label="إلى"
        />
        <button type="button" className="khmasiyat-quiz-btn secondary khmasiyat-range-apply" onClick={() => createRandomAyahQuestion(true)}>تطبيق</button>
      </div>
      <div className="khmasiyat-quiz-progress">المتبقي حتى إنهاء المدى: {randomAyahRemainingCount}</div>
      <div className="khmasiyat-quiz-verse">{randomAyahData?.t || 'اختر مدى صحيحًا ثم اضغط "تطبيق" لعرض سؤال عشوائي.'}</div>
      <div className="khmasiyat-quiz-inputs khmasiyat-quiz-guess-row"><div className="khmasiyat-quiz-field"><label className="khmasiyat-quiz-label">رقم السورة</label><input type="number" className="khmasiyat-quiz-input" value={randomAyahSurahGuess} onChange={(e) => setRandomAyahSurahGuess(e.target.value)} placeholder="من 1 إلى 114" min="1" max="114" /></div><div className="khmasiyat-quiz-field"><label className="khmasiyat-quiz-label">رقم الآية</label><input type="number" className="khmasiyat-quiz-input" value={randomAyahVerseGuess} onChange={(e) => setRandomAyahVerseGuess(e.target.value)} placeholder="مثال: 1 أو 23" min="1" /></div></div>
      <div className="khmasiyat-quiz-actions"><button type="button" className="khmasiyat-quiz-btn" onClick={checkRandomAyahAnswer}>تحقق</button><button type="button" className="khmasiyat-quiz-btn secondary" onClick={createRandomAyahQuestion}>آية جديدة</button><button type="button" className="khmasiyat-quiz-btn secondary" onClick={onClose}>العودة للتصفح</button></div>
      {randomAyahResult && <div className="khmasiyat-quiz-result">{randomAyahResult}</div>}
    </div>
  );
}
