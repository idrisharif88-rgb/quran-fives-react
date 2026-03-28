import { useEffect, useRef, useState } from 'react';
import { getSurahAndRange } from './quranLogic';
import { QURAN_VERSES } from '../data/quranVerses';
import TextDisplay from '../components/TextDisplay';
import { buildShuffledIndices } from './quizUtils';
import { KHMASIYAT_QUIZ_STORAGE_KEY, loadStoredState, saveStoredState } from './persistence';

export default function KhmasiyatQuiz({ onClose }) {
  const [persistedQuizState] = useState(() => loadStoredState(KHMASIYAT_QUIZ_STORAGE_KEY) || {});
  const [quizKhmasiyaIndex, setQuizKhmasiyaIndex] = useState(() => (
    Number.isInteger(persistedQuizState.quizKhmasiyaIndex) ? persistedQuizState.quizKhmasiyaIndex : null
  ));
  const [quizFiveInSurahGuess, setQuizFiveInSurahGuess] = useState(() => (
    typeof persistedQuizState.quizFiveInSurahGuess === 'string' ? persistedQuizState.quizFiveInSurahGuess : ''
  ));
  const [quizSurahGuess, setQuizSurahGuess] = useState(() => (
    typeof persistedQuizState.quizSurahGuess === 'string' ? persistedQuizState.quizSurahGuess : ''
  ));
  const [isSurahShaking, setIsSurahShaking] = useState(false);
  const [isFiveShaking, setIsFiveShaking] = useState(false);
  const [quizRangeStart, setQuizRangeStart] = useState(() => (
    typeof persistedQuizState.quizRangeStart === 'string' ? persistedQuizState.quizRangeStart : '1'
  ));
  const [quizRangeEnd, setQuizRangeEnd] = useState(() => (
    typeof persistedQuizState.quizRangeEnd === 'string' ? persistedQuizState.quizRangeEnd : '1202'
  ));
  const [quizOrder, setQuizOrder] = useState(() => (
    Array.isArray(persistedQuizState.quizOrder) ? persistedQuizState.quizOrder : []
  ));
  const [quizNextPointer, setQuizNextPointer] = useState(() => (
    Number.isInteger(persistedQuizState.quizNextPointer) ? persistedQuizState.quizNextPointer : 0
  ));
  const [quizOrderRange, setQuizOrderRange] = useState(() => {
    const { quizOrderRange } = persistedQuizState;
    if (quizOrderRange && Number.isInteger(quizOrderRange.start) && Number.isInteger(quizOrderRange.end)) {
      return quizOrderRange;
    }
    return { start: 1, end: 1202 };
  });
  const [quizResult, setQuizResult] = useState(() => (
    typeof persistedQuizState.quizResult === 'string' ? persistedQuizState.quizResult : ''
  ));
  const audioCtxRef = useRef(null);

  const createKhmasiyatQuestion = (forceNewCycle = false) => {
    const start = Number(quizRangeStart);
    const end = Number(quizRangeEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 1202 || start > end) {
      setQuizKhmasiyaIndex(null);
      setQuizResult('المدى غير صحيح. أدخل من 1 إلى 1202 بحيث البداية أقل من أو تساوي النهاية.');
      return;
    }

    const rangeChanged = quizOrderRange.start !== start || quizOrderRange.end !== end;
    const needsNewCycle = forceNewCycle || rangeChanged || quizOrder.length === 0 || quizNextPointer >= quizOrder.length;

    if (needsNewCycle) {
      const newOrder = buildShuffledIndices(start, end);
      const firstIndex = newOrder[0] ?? null;
      setQuizOrder(newOrder);
      setQuizNextPointer(firstIndex === null ? 0 : 1);
      setQuizOrderRange({ start, end });
      setQuizKhmasiyaIndex(firstIndex);
    } else {
      setQuizKhmasiyaIndex(quizOrder[quizNextPointer]);
      setQuizNextPointer(prev => prev + 1);
    }

    setQuizFiveInSurahGuess('');
    setQuizSurahGuess('');
    setIsSurahShaking(false);
    setIsFiveShaking(false);
    setQuizResult('');
  };

  // Initialize exactly once when mounted
  useEffect(() => {
    if (quizOrder.length > 0 || quizKhmasiyaIndex !== null) return;
    createKhmasiyatQuestion(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizKhmasiyaIndex, quizOrder.length]);

  useEffect(() => {
    saveStoredState(KHMASIYAT_QUIZ_STORAGE_KEY, {
      quizKhmasiyaIndex,
      quizFiveInSurahGuess,
      quizSurahGuess,
      quizRangeStart,
      quizRangeEnd,
      quizOrder,
      quizNextPointer,
      quizOrderRange,
      quizResult,
    });
  }, [
    quizFiveInSurahGuess,
    quizKhmasiyaIndex,
    quizNextPointer,
    quizOrder,
    quizOrderRange,
    quizRangeEnd,
    quizRangeStart,
    quizResult,
    quizSurahGuess,
  ]);

  const triggerShake = (setter) => {
    setter(false);
    setTimeout(() => setter(true), 0);
    setTimeout(() => setter(false), 550);
  };

  const playCorrectSound = async () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      gain.connect(ctx.destination);

      const playNote = (frequency, start) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, start);
        osc.connect(gain);
        osc.start(start);
        osc.stop(start + 0.18);
      };

      playNote(880, now);
      playNote(1175, now + 0.12);
    } catch {
      // ignore
    }
  };

  const checkKhmasiyatAnswer = () => {
    if (quizKhmasiyaIndex === null) {
      setQuizResult('لا يوجد سؤال حالي. اختر المدى ثم اضغط "تطبيق المدى".');
      return;
    }
    const guessedFiveInSurah = Number(quizFiveInSurahGuess);
    const guessedSurah = Number(quizSurahGuess);
    const fiveInvalid = !Number.isInteger(guessedFiveInSurah);
    const surahInvalid = !Number.isInteger(guessedSurah);
    if (fiveInvalid || surahInvalid) {
      setQuizResult('يرجى إدخال رقم الخماسية داخل السورة ورقم السورة.');
      if (surahInvalid) triggerShake(setIsSurahShaking);
      if (fiveInvalid) triggerShake(setIsFiveShaking);
      return;
    }
    
    const quizKhmasiyaData = getSurahAndRange(quizKhmasiyaIndex);
    const correctFiveInSurah = quizKhmasiyaData?.end ?? 0;
    const correctSurah = quizKhmasiyaData.surah;
    
    if (guessedFiveInSurah === correctFiveInSurah && guessedSurah === correctSurah) {
      setQuizResult('إجابة صحيحة');
      playCorrectSound();
      setTimeout(() => {
        createKhmasiyatQuestion();
      }, 200);
    } else {
      setQuizResult(`غير صحيح. الخماسية داخل السورة: ${correctFiveInSurah} | السورة: ${correctSurah}`);
      if (guessedSurah !== correctSurah) triggerShake(setIsSurahShaking);
      if (guessedFiveInSurah !== correctFiveInSurah) triggerShake(setIsFiveShaking);
    }
  };

  const quizKhmasiyaData = quizKhmasiyaIndex !== null ? getSurahAndRange(quizKhmasiyaIndex) : null;
  const quizLastVerse = quizKhmasiyaData ? QURAN_VERSES[quizKhmasiyaData.absoluteEndIndex - 1] : null;
  const quizRemainingCount = Math.max(0, quizOrder.length - quizNextPointer);

  return (
    <div className="khmasiyat-quiz-panel" dir="rtl">
      <h2 className="khmasiyat-quiz-title">اختبار خماسيات</h2>
      <div className="khmasiyat-quiz-range">
        <span className="khmasiyat-range-label">من</span>
        <input
          type="number"
          className="khmasiyat-quiz-input khmasiyat-range-input"
          value={quizRangeStart}
          onChange={(e) => setQuizRangeStart(e.target.value)}
          placeholder="0001"
          min="1"
          max="1202"
          aria-label="من خماسية"
          maxLength="4"
        />
        <span className="khmasiyat-range-label">إلى</span>
        <input
          type="number"
          className="khmasiyat-quiz-input khmasiyat-range-input"
          value={quizRangeEnd}
          onChange={(e) => setQuizRangeEnd(e.target.value)}
          placeholder="1202"
          min="1"
          max="1202"
          aria-label="إلى خماسية"
          maxLength="4"
        />
        <button type="button" className="khmasiyat-quiz-btn secondary khmasiyat-range-apply" onClick={() => createKhmasiyatQuestion(true)}>تطبيق</button>
      </div>
      <div className="khmasiyat-quiz-progress">المتبقي حتى إنهاء المدى: {quizRemainingCount}</div>
      {quizLastVerse ? (
        <TextDisplay verses={[quizLastVerse]} hideVerseNumber />
      ) : (
        <div className="verse-container">اختر مدى صحيحًا ثم اضغط "تطبيق المدى" لعرض سؤال عشوائي.</div>
      )}
      <div className="khmasiyat-quiz-inputs khmasiyat-quiz-guess-row">
        <div className="khmasiyat-quiz-field">
          <label className="khmasiyat-quiz-label">رقم السورة</label>
          <input
            type="number"
            className={`khmasiyat-quiz-input ${isSurahShaking ? 'shake border-error' : ''}`}
            value={quizSurahGuess}
            onChange={(e) => setQuizSurahGuess(e.target.value)}
            placeholder="من 1 إلى 114"
            min="1"
            max="114"
          />
        </div>
        <div className="khmasiyat-quiz-field">
          <label className="khmasiyat-quiz-label">رقم الآية</label>
          <input
            type="number"
            className={`khmasiyat-quiz-input ${isFiveShaking ? 'shake border-error' : ''}`}
            value={quizFiveInSurahGuess}
            onChange={(e) => setQuizFiveInSurahGuess(e.target.value)}
            placeholder="مثال: 5 أو 10 أو 15"
            min="5"
          />
        </div>
      </div>
      <div className="khmasiyat-quiz-actions">
        <button type="button" className="khmasiyat-quiz-btn" onClick={checkKhmasiyatAnswer}>تحقق</button>
        <button type="button" className="khmasiyat-quiz-btn secondary" onClick={onClose}>العودة للتصفح</button>
      </div>
      {quizResult && <div className="khmasiyat-quiz-result">{quizResult}</div>}
    </div>
  );
}
