import { useState, useEffect, useRef } from 'react';
import CustomKeyboard, { useCustomKeyboard } from '../components/CustomKeyboard';
import { SURAH_METADATA } from '../data/quranConstants';
import { buildShuffledIndices } from './quizUtils';
import { loadStoredState, saveStoredState } from './persistence';

const SURAH_NAMES_QUIZ_STORAGE_KEY = 'quran_fives_surah_names_quiz_state';

export default function SurahNamesQuiz({ onClose }) {
  const [persistedQuizState] = useState(() => loadStoredState(SURAH_NAMES_QUIZ_STORAGE_KEY) || {});
  
  // mode: 'name-to-number' (أسماء السور -> أرقام السور) or 'number-to-name' (أرقام السور -> أسماء السور)
  const [mode, setMode] = useState(() => (
    typeof persistedQuizState.mode === 'string' ? persistedQuizState.mode : 'name-to-number'
  ));
  const [questionIndex, setQuestionIndex] = useState(() => (
    Number.isInteger(persistedQuizState.questionIndex) ? persistedQuizState.questionIndex : null
  ));
  const [order, setOrder] = useState(() => (
    Array.isArray(persistedQuizState.order) ? persistedQuizState.order : []
  ));
  const [nextPointer, setNextPointer] = useState(() => (
    Number.isInteger(persistedQuizState.nextPointer) ? persistedQuizState.nextPointer : 0
  ));
  const [guess, setGuess] = useState(() => (
    typeof persistedQuizState.guess === 'string' ? persistedQuizState.guess : ''
  ));
  const [result, setResult] = useState(() => (
    typeof persistedQuizState.result === 'string' ? persistedQuizState.result : ''
  ));
  const [correctCount, setCorrectCount] = useState(() => (
    Number.isInteger(persistedQuizState.correctCount) ? persistedQuizState.correctCount : 0
  ));
  const [incorrectCount, setIncorrectCount] = useState(() => (
    Number.isInteger(persistedQuizState.incorrectCount) ? persistedQuizState.incorrectCount : 0
  ));
  const [isGuessShaking, setIsGuessShaking] = useState(false);
  const audioCtxRef = useRef(null);

  const createQuestion = (forceNewCycle = false) => {
    const needsNewCycle = forceNewCycle || order.length === 0 || nextPointer >= order.length;
    if (needsNewCycle) {
      const newOrder = buildShuffledIndices(1, 114);
      setOrder(newOrder);
      setNextPointer(1);
      setQuestionIndex(newOrder[0]);
      setCorrectCount(0);
      setIncorrectCount(0);
    } else {
      setQuestionIndex(order[nextPointer]);
      setNextPointer(prev => prev + 1);
    }
    setGuess('');
    setResult('');
    setIsGuessShaking(false);
  };

  useEffect(() => {
    if (order.length > 0 || questionIndex !== null) return;
    createQuestion(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.length, questionIndex]);

  useEffect(() => {
    saveStoredState(SURAH_NAMES_QUIZ_STORAGE_KEY, {
      mode,
      questionIndex,
      order,
      nextPointer,
      guess,
      result,
      correctCount,
      incorrectCount,
    });
  }, [mode, questionIndex, order, nextPointer, guess, result, correctCount, incorrectCount]);

  const triggerShake = () => {
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

  const normalizeArabic = (str) => {
    if (!str) return '';
    return str
      .replace(/[\u0617-\u061A\u064B-\u0652\u0670]/g, '') // إزالة التشكيل
      .replace(/[أإآ]/g, 'ا') // توحيد الهمزات
      .replace(/ة/g, 'ه') // توحيد التاء المربوطة والهاء
      .replace(/ي$/g, 'ى') // توحيد الياء والألف المقصورة في النهاية
      .replace(/\s+/g, '') // إزالة المسافات
      .replace(/^ال/, ''); // تجاهل "ال" التعريف
  };

  const checkAnswer = () => {
    if (mode === 'number-to-name') {
      const num = Number(guess);
      if (!guess.trim() || !Number.isInteger(num) || num < 1 || num > 114) {
        setResult('الرقم يجب أن يكون بين 1 و 114');
        triggerShake();
        return;
      }
      const found = SURAH_METADATA.find(s => s.id === num);
      setResult(found ? found.name : '');
      return;
    }

    const surah = SURAH_METADATA.find(s => s.id === questionIndex);
    if (!surah) return;

    if (mode === 'name-to-number') {
      const guessedNum = Number(guess);
      if (!Number.isInteger(guessedNum)) {
        setResult('يرجى إدخال رقم السورة بشكل صحيح.');
        triggerShake();
        return;
      }
      if (guessedNum === surah.id) {
        setResult('إجابة صحيحة!');
        setCorrectCount(c => c + 1);
        playCorrectSound();
        setTimeout(() => createQuestion(), 600);
      } else {
        setResult(`غير صحيح. رقم السورة هو: ${surah.id}`);
        setIncorrectCount(c => c + 1);
        triggerShake();
      }
    }
  };

  const remainingCount = Math.max(0, order.length - nextPointer + 1);

  const keyboard = useCustomKeyboard({
    numGuess: {
      value: guess,
      setValue: setGuess,
      maxLength: 3,
      label: 'رقم السورة',
      submitLabel: mode === 'number-to-name' ? 'اعرض' : 'تحقق',
      onSubmit: checkAnswer,
    }
  });

  return (
    <div className="khmasiyat-quiz-panel" dir="rtl">
      <h2 className="khmasiyat-quiz-title">اختبار سور</h2>
      
      <div className="surah-count-mode-switch">
        <button type="button" className={`khmasiyat-quiz-btn secondary ${mode === 'name-to-number' ? 'active' : ''}`} onClick={() => { setMode('name-to-number'); setGuess(''); setResult(''); if (keyboard.showKeyboard) keyboard.closeKeyboard(); }}>اسم السورة ← رقم السورة</button>
        <button type="button" className={`khmasiyat-quiz-btn secondary ${mode === 'number-to-name' ? 'active' : ''}`} onClick={() => { setMode('number-to-name'); setGuess(''); setResult(''); if (keyboard.showKeyboard) keyboard.closeKeyboard(); }}>رقم السورة ← اسم السورة</button>
      </div>

      {mode === 'name-to-number' && (
        <div className="khmasiyat-quiz-progress" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span>المتبقي: {remainingCount} سورة</span>
          <span style={{ color: 'var(--app-accent)' }}>صحيح: {correctCount}</span>
          <span style={{ color: 'var(--app-danger)' }}>خاطئ: {incorrectCount}</span>
          <button type="button" className="quiz-stat-reset-btn" onClick={() => { setCorrectCount(0); setIncorrectCount(0); }} title="تصفير العداد">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 5V2L7 7l5 5V8c2.97 0 5.44 2.16 5.91 5h2.02A8.004 8.004 0 0 0 12 5zm-5.91 6H4.07A8.004 8.004 0 0 0 12 19v3l5-5-5-5v3c-2.97 0-5.44-2.16-5.91-5z"/>
            </svg>
          </button>
        </div>
      )}
      
      {mode === 'name-to-number' && (
        <div className="khmasiyat-quiz-verse" style={{ fontSize: '1.5rem', textAlign: 'center' }}>
          {`سورة ${SURAH_METADATA.find(s => s.id === questionIndex)?.name}`}
        </div>
      )}

      <div className="khmasiyat-quiz-inputs">
        <div className="khmasiyat-quiz-field">
          <label className="khmasiyat-quiz-label">
            {mode === 'name-to-number' ? 'أدخل رقم السورة' : 'أدخل رقم السورة (1 – 114)'}
          </label>
          <input
            type="text"
            value={guess}
            placeholder="مثال: 1"
            {...keyboard.getInputProps('numGuess', { className: `khmasiyat-quiz-input ${isGuessShaking ? 'shake border-error' : ''}` })}
          />
        </div>
      </div>

      <div className="khmasiyat-quiz-actions">
        <button type="button" className="khmasiyat-quiz-btn" onClick={() => { keyboard.closeKeyboard(); checkAnswer(); }}>
          {mode === 'number-to-name' ? 'اعرض' : 'تحقق'}
        </button>
        {mode === 'name-to-number' && (
          <button type="button" className="khmasiyat-quiz-btn secondary" onClick={() => { keyboard.closeKeyboard(); createQuestion(); }}>تخطي</button>
        )}
        <button type="button" className="khmasiyat-quiz-btn secondary" onClick={() => { keyboard.closeKeyboard(); onClose(); }}>العودة للتصفح</button>
      </div>

      {result && (
        <div
          className="khmasiyat-quiz-result"
          style={
            mode === 'number-to-name' && !result.includes('يجب')
              ? { fontSize: '2rem', fontWeight: 'bold', color: 'var(--app-accent)', letterSpacing: '2px' }
              : {}
          }
        >
          {result}
        </div>
      )}
      
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