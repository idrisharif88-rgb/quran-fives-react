import { useEffect, useRef, useState } from 'react';
import { PAGE_STARTS } from '../data/pageStarts';
import CustomKeyboard, { useCustomKeyboard } from '../components/CustomKeyboard';
import TextDisplay from '../components/TextDisplay';
import { buildShuffledIndices } from './quizUtils';
import { PAGE_STARTS_QUIZ_STORAGE_KEY, loadStoredState, saveStoredState } from './persistence';

export default function PageStartsQuiz({ onClose }) {
  const [persistedQuizState] = useState(() => loadStoredState(PAGE_STARTS_QUIZ_STORAGE_KEY) || {});
  const [rangeStart, setRangeStart] = useState(() => (
    typeof persistedQuizState.rangeStart === 'string' ? persistedQuizState.rangeStart : '1'
  ));
  const [rangeEnd, setRangeEnd] = useState(() => (
    typeof persistedQuizState.rangeEnd === 'string' ? persistedQuizState.rangeEnd : '604'
  ));
  const [order, setOrder] = useState(() => (
    Array.isArray(persistedQuizState.order) ? persistedQuizState.order : []
  ));
  const [nextPointer, setNextPointer] = useState(() => (
    Number.isInteger(persistedQuizState.nextPointer) ? persistedQuizState.nextPointer : 0
  ));
  const [orderRange, setOrderRange] = useState(() => {
    const { orderRange } = persistedQuizState;
    if (orderRange && Number.isInteger(orderRange.start) && Number.isInteger(orderRange.end)) {
      return orderRange;
    }
    return { start: 1, end: 604 };
  });
  const [currentIndex, setCurrentIndex] = useState(() => (
    Number.isInteger(persistedQuizState.currentIndex) ? persistedQuizState.currentIndex : null
  ));
  const [result, setResult] = useState(() => (
    typeof persistedQuizState.result === 'string' ? persistedQuizState.result : ''
  ));
  const [pageGuess, setPageGuess] = useState(() => (
    typeof persistedQuizState.pageGuess === 'string' ? persistedQuizState.pageGuess : ''
  ));
  const [correctCount, setCorrectCount] = useState(() => (
    Number.isInteger(persistedQuizState.correctCount) ? persistedQuizState.correctCount : 0
  ));
  const [incorrectCount, setIncorrectCount] = useState(() => (
    Number.isInteger(persistedQuizState.incorrectCount) ? persistedQuizState.incorrectCount : 0
  ));
  const [isGuessShaking, setIsGuessShaking] = useState(false);
  const audioCtxRef = useRef(null);

  const applyRange = (forceNewCycle = false) => {
    const start = Number(rangeStart);
    const end = Number(rangeEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 604 || start > end) {
      setCurrentIndex(null);
      setResult('المدى غير صحيح. أدخل من 1 إلى 604 بحيث البداية أقل من أو تساوي النهاية.');
      return;
    }

    const rangeChanged = orderRange.start !== start || orderRange.end !== end;
    const needsNewCycle = forceNewCycle || rangeChanged || order.length === 0 || nextPointer >= order.length;

    if (needsNewCycle) {
      const newOrder = buildShuffledIndices(start, end);
      const firstIndex = newOrder[0] ?? null;
      setOrder(newOrder);
      setNextPointer(firstIndex === null ? 0 : 1);
      setOrderRange({ start, end });
      setCurrentIndex(firstIndex);
      setCorrectCount(0);
      setIncorrectCount(0);
    } else {
      setCurrentIndex(order[nextPointer]);
      setNextPointer((prev) => prev + 1);
    }

    setPageGuess('');
    setIsGuessShaking(false);
    setResult('');
  };

  useEffect(() => {
    if (order.length > 0 || currentIndex !== null) return;
    applyRange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, order.length]);

  useEffect(() => {
    saveStoredState(PAGE_STARTS_QUIZ_STORAGE_KEY, {
      rangeStart,
      rangeEnd,
      order,
      nextPointer,
      orderRange,
      currentIndex,
      result,
      pageGuess,
      correctCount,
      incorrectCount,
    });
  }, [currentIndex, nextPointer, order, orderRange, pageGuess, rangeEnd, rangeStart, result, correctCount, incorrectCount]);

  const remaining = Math.max(0, order.length - nextPointer);
  const verse = currentIndex !== null ? PAGE_STARTS[currentIndex] : null;

  const triggerGuessShake = () => {
    setIsGuessShaking(false);
    setTimeout(() => setIsGuessShaking(true), 0);
    setTimeout(() => setIsGuessShaking(false), 550);
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

  const checkAnswer = () => {
    if (!verse) {
      setResult('لا يوجد سؤال حالي. اختر المدى ثم اضغط "تطبيق".');
      return;
    }

    const guessed = parseInt(pageGuess, 10);
    if (!Number.isInteger(guessed) || guessed < 1 || guessed > 604) {
      setResult('رجاء ادخل عدد مناسب');
      triggerGuessShake();
      return;
    }

    if (guessed === verse.page) {
      setResult('إجابة صحيحة');
      setCorrectCount(c => c + 1);
      playCorrectSound();
      setTimeout(() => applyRange(false), 200);
    } else {
      setResult(`غير صحيح. الصفحة: ${verse.page}`);
      setIncorrectCount(c => c + 1);
      triggerGuessShake();
    }
  };

  const keyboard = useCustomKeyboard({
    rangeStart: {
      value: rangeStart,
      setValue: setRangeStart,
      maxLength: 3,
      label: 'بداية مدى الصفحات',
      submitLabel: 'تطبيق',
      onSubmit: () => applyRange(true),
    },
    rangeEnd: {
      value: rangeEnd,
      setValue: setRangeEnd,
      maxLength: 3,
      label: 'نهاية مدى الصفحات',
      submitLabel: 'تطبيق',
      onSubmit: () => applyRange(true),
    },
    pageGuess: {
      value: pageGuess,
      setValue: setPageGuess,
      maxLength: 3,
      label: 'رقم الصفحة',
      submitLabel: 'تحقق',
      onSubmit: checkAnswer,
    },
  });

  return (
    <div className="khmasiyat-quiz-panel" dir="rtl">
      <h2 className="khmasiyat-quiz-title">اختبار بدايات صفحات</h2>

      <div className="khmasiyat-quiz-range">
        <span className="khmasiyat-range-label">من</span>
        <input
          type="text"
          value={rangeStart}
          placeholder="1"
          min="1"
          max="604"
          aria-label="من"
          {...keyboard.getInputProps('rangeStart', { className: 'khmasiyat-quiz-input khmasiyat-range-input' })}
        />
        <span className="khmasiyat-range-label">إلى</span>
        <input
          type="text"
          value={rangeEnd}
          placeholder="604"
          min="1"
          max="604"
          aria-label="إلى"
          {...keyboard.getInputProps('rangeEnd', { className: 'khmasiyat-quiz-input khmasiyat-range-input' })}
        />
        <button type="button" className="khmasiyat-quiz-btn secondary khmasiyat-range-apply" onClick={() => { keyboard.closeKeyboard(); applyRange(true); }}>
          تطبيق
        </button>
      </div>

      <div className="khmasiyat-quiz-progress" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <span>المتبقي: {remaining}</span>
        <span style={{ color: 'var(--app-accent)' }}>صحيح: {correctCount}</span>
        <span style={{ color: 'var(--app-danger)' }}>خاطئ: {incorrectCount}</span>
        <button type="button" className="quiz-stat-reset-btn" onClick={() => { setCorrectCount(0); setIncorrectCount(0); }} title="تصفير العداد">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 5V2L7 7l5 5V8c2.97 0 5.44 2.16 5.91 5h2.02A8.004 8.004 0 0 0 12 5zm-5.91 6H4.07A8.004 8.004 0 0 0 12 19v3l5-5-5-5v3c-2.97 0-5.44-2.16-5.91-5z"/>
          </svg>
        </button>
      </div>

      {verse ? (
        <TextDisplay verses={[verse]} hideVerseNumber />
      ) : (
        <div className="verse-container">اختر مدى صحيحًا ثم اضغط "تطبيق".</div>
      )}

      <div className="page-starts-quiz-check">
        <div className={`input-inner-wrapper ${isGuessShaking ? 'shake border-error' : ''}`}>
          <input
            type="text"
            value={pageGuess}
            placeholder="1"
            min="1"
            max="604"
            dir="ltr"
            aria-label="page number"
            {...keyboard.getInputProps('pageGuess', { className: 'jump-input' })}
          />
        </div>
        <button type="button" className="khmasiyat-quiz-btn" onClick={() => { keyboard.closeKeyboard(); checkAnswer(); }}>
          تحقق
        </button>
      </div>

      <div className="khmasiyat-quiz-actions">
        <button type="button" className="khmasiyat-quiz-btn secondary" onClick={() => { keyboard.closeKeyboard(); onClose(); }}>
          عودة
        </button>
      </div>

      {result && <div className="khmasiyat-quiz-result">{result}</div>}
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
