import { useState, useEffect, useRef } from 'react';
import CustomKeyboard, { useCustomKeyboard } from '../components/CustomKeyboard';
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
  const [correctCount, setCorrectCount] = useState(() => (
    Number.isInteger(persistedQuizState.correctCount) ? persistedQuizState.correctCount : 0
  ));
  const [incorrectCount, setIncorrectCount] = useState(() => (
    Number.isInteger(persistedQuizState.incorrectCount) ? persistedQuizState.incorrectCount : 0
  ));
  const [isSurahShaking, setIsSurahShaking] = useState(false);
  const [isVerseShaking, setIsVerseShaking] = useState(false);
  const audioCtxRef = useRef(null);

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
      setCorrectCount(0);
      setIncorrectCount(0);
    } else {
      setRandomAyahIndex(randomAyahOrder[randomAyahNextPointer]);
      setRandomAyahNextPointer(prev => prev + 1);
    }

    setRandomAyahSurahGuess('');
    setRandomAyahVerseGuess('');
    setRandomAyahResult('');
    setIsSurahShaking(false);
    setIsVerseShaking(false);
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
      correctCount,
      incorrectCount,
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
    correctCount,
    incorrectCount,
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
      gain.gain.exponentialRampToValueAtTime(0.5, now + 0.01);
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

  const checkRandomAyahAnswer = () => {
    if (randomAyahIndex === null) {
      setRandomAyahResult('لا يوجد سؤال حالي. اختر المدى ثم اضغط "تطبيق".');
      return;
    }
    const guessedSurah = Number(randomAyahSurahGuess);
    const guessedVerse = Number(randomAyahVerseGuess);
    const surahInvalid = !Number.isInteger(guessedSurah);
    const verseInvalid = !Number.isInteger(guessedVerse);
    
    if (surahInvalid || verseInvalid) {
      setRandomAyahResult('يرجى إدخال رقم السورة ورقم الآية.');
      if (surahInvalid) triggerShake(setIsSurahShaking);
      if (verseInvalid) triggerShake(setIsVerseShaking);
      return;
    }

    const randomAyahData = QURAN_VERSES[randomAyahIndex];
    const correctSurah = randomAyahData?.s ?? 0;
    const correctVerse = randomAyahData?.a ?? 0;
    
    if (guessedSurah === correctSurah && guessedVerse === correctVerse) {
      setRandomAyahResult('إجابة صحيحة');
      setCorrectCount(c => c + 1);
      playCorrectSound();
      setTimeout(() => {
        createRandomAyahQuestion();
      }, 200);
    } else {
      setRandomAyahResult(`غير صحيح. السورة: ${correctSurah} | الآية: ${correctVerse}`);
      setIncorrectCount(c => c + 1);
      if (guessedSurah !== correctSurah) triggerShake(setIsSurahShaking);
      if (guessedVerse !== correctVerse) triggerShake(setIsVerseShaking);
    }
  };

  const randomAyahData = randomAyahIndex !== null ? QURAN_VERSES[randomAyahIndex] : null;
  const randomAyahRemainingCount = Math.max(0, randomAyahOrder.length - randomAyahNextPointer);
  const keyboard = useCustomKeyboard({
    rangeStart: {
      value: randomAyahRangeStart,
      setValue: setRandomAyahRangeStart,
      maxLength: 4,
      label: 'بداية مدى الآيات',
      submitLabel: 'تطبيق',
      onSubmit: () => createRandomAyahQuestion(true),
    },
    rangeEnd: {
      value: randomAyahRangeEnd,
      setValue: setRandomAyahRangeEnd,
      maxLength: 4,
      label: 'نهاية مدى الآيات',
      submitLabel: 'تطبيق',
      onSubmit: () => createRandomAyahQuestion(true),
    },
    surahGuess: {
      value: randomAyahSurahGuess,
      setValue: setRandomAyahSurahGuess,
      maxLength: 3,
      label: 'رقم السورة',
      submitLabel: 'تحقق',
      onSubmit: checkRandomAyahAnswer,
    },
    verseGuess: {
      value: randomAyahVerseGuess,
      setValue: setRandomAyahVerseGuess,
      maxLength: 3,
      label: 'رقم الآية',
      submitLabel: 'تحقق',
      onSubmit: checkRandomAyahAnswer,
    },
  });

  return (
    <div className="khmasiyat-quiz-panel" dir="rtl">
      <h2 className="khmasiyat-quiz-title">اختبار آيات عشوائي</h2>
      <div className="khmasiyat-quiz-range">
        <span className="khmasiyat-range-label">من</span>
        <input
          type="text"
          value={randomAyahRangeStart}
          placeholder="1"
          min="1"
          max={QURAN_VERSES.length}
          aria-label="من"
          {...keyboard.getInputProps('rangeStart', { className: 'khmasiyat-quiz-input khmasiyat-range-input' })}
        />
        <span className="khmasiyat-range-label">إلى</span>
        <input
          type="text"
          value={randomAyahRangeEnd}
          placeholder={String(QURAN_VERSES.length)}
          min="1"
          max={QURAN_VERSES.length}
          aria-label="إلى"
          {...keyboard.getInputProps('rangeEnd', { className: 'khmasiyat-quiz-input khmasiyat-range-input' })}
        />
        <button type="button" className="khmasiyat-quiz-btn secondary khmasiyat-range-apply" onClick={() => { keyboard.closeKeyboard(); createRandomAyahQuestion(true); }}>تطبيق</button>
      </div>
      <div className="khmasiyat-quiz-progress" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <span>المتبقي: {randomAyahRemainingCount}</span>
        <span style={{ color: 'var(--app-accent)' }}>صحيح: {correctCount}</span>
        <span style={{ color: 'var(--app-danger)' }}>خاطئ: {incorrectCount}</span>
        <button type="button" className="quiz-stat-reset-btn" onClick={() => { setCorrectCount(0); setIncorrectCount(0); }} title="تصفير العداد">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 5V2L7 7l5 5V8c2.97 0 5.44 2.16 5.91 5h2.02A8.004 8.004 0 0 0 12 5zm-5.91 6H4.07A8.004 8.004 0 0 0 12 19v3l5-5-5-5v3c-2.97 0-5.44-2.16-5.91-5z"/>
          </svg>
        </button>
      </div>
      <div className="khmasiyat-quiz-verse">{randomAyahData?.t || 'اختر مدى صحيحًا ثم اضغط "تطبيق" لعرض سؤال عشوائي.'}</div>
      <div className="khmasiyat-quiz-inputs khmasiyat-quiz-guess-row">
        <div className="khmasiyat-quiz-field">
          <label className="khmasiyat-quiz-label">رقم السورة</label>
          <input
            type="text"
            value={randomAyahSurahGuess}
            placeholder="من 1 إلى 114"
            min="1"
            max="114"
            {...keyboard.getInputProps('surahGuess', { className: `khmasiyat-quiz-input ${isSurahShaking ? 'shake border-error' : ''}` })}
          />
        </div>
        <div className="khmasiyat-quiz-field">
          <label className="khmasiyat-quiz-label">رقم الآية</label>
          <input
            type="text"
            value={randomAyahVerseGuess}
            placeholder="مثال: 1 أو 23"
            min="1"
            {...keyboard.getInputProps('verseGuess', { className: `khmasiyat-quiz-input ${isVerseShaking ? 'shake border-error' : ''}` })}
          />
        </div>
      </div>
      <div className="khmasiyat-quiz-actions">
        <button type="button" className="khmasiyat-quiz-btn" onClick={() => { keyboard.closeKeyboard(); checkRandomAyahAnswer(); }}>تحقق</button>
        <button type="button" className="khmasiyat-quiz-btn secondary" onClick={() => { keyboard.closeKeyboard(); createRandomAyahQuestion(); }}>آية جديدة</button>
        <button type="button" className="khmasiyat-quiz-btn secondary" onClick={() => { keyboard.closeKeyboard(); onClose(); }}>العودة للتصفح</button>
      </div>
      {randomAyahResult && <div className="khmasiyat-quiz-result">{randomAyahResult}</div>}
      <CustomKeyboard
        visible={keyboard.showKeyboard}
        label={keyboard.activeConfig?.label}
        value={keyboard.activeConfig?.value}
        allowColon={Boolean(keyboard.activeConfig?.allowColon)}
        submitLabel={keyboard.activeConfig?.submitLabel}
        onInsert={keyboard.handleKeyboardKeyPress}
        onBackspace={keyboard.handleKeyboardBackspace}
        onSubmit={keyboard.handleKeyboardSubmit}
        onClose={keyboard.closeKeyboard}
      />
    </div>
  );
}
