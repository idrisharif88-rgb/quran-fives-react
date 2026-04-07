import { useEffect, useRef, useState } from 'react';
import { getSurahAndRange } from './quranLogic';
import { QURAN_VERSES } from '../data/quranVerses';
import CustomKeyboard, { useCustomKeyboard } from '../components/CustomKeyboard';
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
  const [correctCount, setCorrectCount] = useState(() => (
    Number.isInteger(persistedQuizState.correctCount) ? persistedQuizState.correctCount : 0
  ));
  const [incorrectCount, setIncorrectCount] = useState(() => (
    Number.isInteger(persistedQuizState.incorrectCount) ? persistedQuizState.incorrectCount : 0
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
      setCorrectCount(0);
      setIncorrectCount(0);
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
      correctCount,
      incorrectCount,
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
      setCorrectCount(c => c + 1);
      playCorrectSound();
      setTimeout(() => {
        createKhmasiyatQuestion();
      }, 200);
    } else {
      setQuizResult(`غير صحيح. الخماسية داخل السورة: ${correctFiveInSurah} | السورة: ${correctSurah}`);
      setIncorrectCount(c => c + 1);
      if (guessedSurah !== correctSurah) triggerShake(setIsSurahShaking);
      if (guessedFiveInSurah !== correctFiveInSurah) triggerShake(setIsFiveShaking);
    }
  };

  const quizKhmasiyaData = quizKhmasiyaIndex !== null ? getSurahAndRange(quizKhmasiyaIndex) : null;
  let quizVersesToDisplay = [];
  let quizLastVerse = null; // Keeping this for the truthiness check below
  if (quizKhmasiyaData) {
    const lastVerseIndex = quizKhmasiyaData.absoluteEndIndex - 1;
    quizLastVerse = QURAN_VERSES[lastVerseIndex] || null;
    if (quizLastVerse) {
      quizVersesToDisplay.push(quizLastVerse);
      const similarKhmasiyatIndices = [962, 963, 965, 966, 968, 970, 972];
      if (similarKhmasiyatIndices.includes(quizKhmasiyaIndex) && QURAN_VERSES[lastVerseIndex + 1]) {
        quizVersesToDisplay.push(QURAN_VERSES[lastVerseIndex + 1]);
      }
    }
  }
  const quizRemainingCount = Math.max(0, quizOrder.length - quizNextPointer);
  const keyboard = useCustomKeyboard({
    rangeStart: {
      value: quizRangeStart,
      setValue: setQuizRangeStart,
      maxLength: 4,
      label: 'بداية مدى الخماسيات',
      submitLabel: 'تطبيق',
      onSubmit: () => createKhmasiyatQuestion(true),
    },
    rangeEnd: {
      value: quizRangeEnd,
      setValue: setQuizRangeEnd,
      maxLength: 4,
      label: 'نهاية مدى الخماسيات',
      submitLabel: 'تطبيق',
      onSubmit: () => createKhmasiyatQuestion(true),
    },
    surahGuess: {
      value: quizSurahGuess,
      setValue: setQuizSurahGuess,
      maxLength: 3,
      label: 'رقم السورة',
      submitLabel: 'تحقق',
      onSubmit: checkKhmasiyatAnswer,
    },
    fiveGuess: {
      value: quizFiveInSurahGuess,
      setValue: setQuizFiveInSurahGuess,
      maxLength: 3,
      label: 'رقم الآية',
      submitLabel: 'تحقق',
      onSubmit: checkKhmasiyatAnswer,
    },
  });

  return (
    <div className="khmasiyat-quiz-panel" dir="rtl">
      <h2 className="khmasiyat-quiz-title">اختبار خماسيات</h2>
      <div className="khmasiyat-quiz-range">
        <span className="khmasiyat-range-label">من</span>
        <input
          type="text"
          value={quizRangeStart}
          placeholder="0001"
          min="1"
          max="1202"
          aria-label="من خماسية"
          maxLength="4"
          {...keyboard.getInputProps('rangeStart', { className: 'khmasiyat-quiz-input khmasiyat-range-input' })}
        />
        <span className="khmasiyat-range-label">إلى</span>
        <input
          type="text"
          value={quizRangeEnd}
          placeholder="1202"
          min="1"
          max="1202"
          aria-label="إلى خماسية"
          maxLength="4"
          {...keyboard.getInputProps('rangeEnd', { className: 'khmasiyat-quiz-input khmasiyat-range-input' })}
        />
        <button type="button" className="khmasiyat-quiz-btn secondary khmasiyat-range-apply" onClick={() => { keyboard.closeKeyboard(); createKhmasiyatQuestion(true); }}>تطبيق</button>
      </div>
      <div className="khmasiyat-quiz-progress" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <span>المتبقي: {quizRemainingCount}</span>
        <span style={{ color: 'var(--app-accent)' }}>صحيح: {correctCount}</span>
        <span style={{ color: 'var(--app-danger)' }}>خاطئ: {incorrectCount}</span>
        <button type="button" className="quiz-stat-reset-btn" onClick={() => { setCorrectCount(0); setIncorrectCount(0); }} title="تصفير العداد">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 5V2L7 7l5 5V8c2.97 0 5.44 2.16 5.91 5h2.02A8.004 8.004 0 0 0 12 5zm-5.91 6H4.07A8.004 8.004 0 0 0 12 19v3l5-5-5-5v3c-2.97 0-5.44-2.16-5.91-5z"/>
          </svg>
        </button>
      </div>
      {quizVersesToDisplay.length > 0 ? (
        <TextDisplay verses={quizVersesToDisplay} hideVerseNumber />
      ) : (
        <div className="verse-container">اختر مدى صحيحًا ثم اضغط "تطبيق المدى" لعرض سؤال عشوائي.</div>
      )}
      <div className="khmasiyat-quiz-inputs khmasiyat-quiz-guess-row">
        <div className="khmasiyat-quiz-field">
          <label className="khmasiyat-quiz-label">رقم السورة</label>
          <input
            type="text"
            value={quizSurahGuess}
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
            value={quizFiveInSurahGuess}
            placeholder="مثال: 5 أو 10 أو 15"
            min="5"
            {...keyboard.getInputProps('fiveGuess', { className: `khmasiyat-quiz-input ${isFiveShaking ? 'shake border-error' : ''}` })}
          />
        </div>
      </div>
      <div className="khmasiyat-quiz-actions">
        <button type="button" className="khmasiyat-quiz-btn" onClick={() => { keyboard.closeKeyboard(); checkKhmasiyatAnswer(); }}>تحقق</button>
        <button type="button" className="khmasiyat-quiz-btn secondary" onClick={() => { keyboard.closeKeyboard(); onClose(); }}>العودة للتصفح</button>
      </div>
      {quizResult && <div className="khmasiyat-quiz-result">{quizResult}</div>}
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
