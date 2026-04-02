import { useState, useEffect, useRef } from 'react';
import CustomKeyboard, { useCustomKeyboard } from '../components/CustomKeyboard';
import { SURAH_METADATA } from '../data/quranConstants';
import { buildShuffledIndices } from './quizUtils';
import { SURAH_COUNT_QUIZ_STORAGE_KEY, loadStoredState, saveStoredState } from './persistence';

export default function SurahCountQuiz({ onClose }) {
  const [persistedQuizState] = useState(() => loadStoredState(SURAH_COUNT_QUIZ_STORAGE_KEY) || {});
  const [surahCountMode, setSurahCountMode] = useState(() => (
    typeof persistedQuizState.surahCountMode === 'string' ? persistedQuizState.surahCountMode : 'name-to-count'
  ));
  const [surahCountQuestionIndex, setSurahCountQuestionIndex] = useState(() => (
    Number.isInteger(persistedQuizState.surahCountQuestionIndex) ? persistedQuizState.surahCountQuestionIndex : 0
  ));
  const [surahCountOrder, setSurahCountOrder] = useState(() => (
    Array.isArray(persistedQuizState.surahCountOrder) ? persistedQuizState.surahCountOrder : []
  ));
  const [surahCountNextPointer, setSurahCountNextPointer] = useState(() => (
    Number.isInteger(persistedQuizState.surahCountNextPointer) ? persistedQuizState.surahCountNextPointer : 0
  ));
  const [surahCountGuess, setSurahCountGuess] = useState(() => (
    typeof persistedQuizState.surahCountGuess === 'string' ? persistedQuizState.surahCountGuess : ''
  ));
  const [surahCountInput, setSurahCountInput] = useState(() => (
    typeof persistedQuizState.surahCountInput === 'string' ? persistedQuizState.surahCountInput : ''
  ));
  const [surahCountResult, setSurahCountResult] = useState(() => (
    typeof persistedQuizState.surahCountResult === 'string' ? persistedQuizState.surahCountResult : ''
  ));
  const [correctCount, setCorrectCount] = useState(() => (
    Number.isInteger(persistedQuizState.correctCount) ? persistedQuizState.correctCount : 0
  ));
  const [incorrectCount, setIncorrectCount] = useState(() => (
    Number.isInteger(persistedQuizState.incorrectCount) ? persistedQuizState.incorrectCount : 0
  ));
  const [isGuessShaking, setIsGuessShaking] = useState(false);
  const [isInputShaking, setIsInputShaking] = useState(false);
  const audioCtxRef = useRef(null);

  const createSurahCountQuestion = (forceNewCycle = false) => {
    const needsNewCycle = forceNewCycle || surahCountOrder.length === 0 || surahCountNextPointer >= surahCountOrder.length;
    if (needsNewCycle) {
      const newOrder = buildShuffledIndices(1, SURAH_METADATA.length);
      const firstIndex = newOrder[0] ?? 0;
      setSurahCountOrder(newOrder);
      setSurahCountNextPointer(newOrder.length > 0 ? 1 : 0);
      setSurahCountQuestionIndex(firstIndex);
      setCorrectCount(0);
      setIncorrectCount(0);
    } else {
      setSurahCountQuestionIndex(surahCountOrder[surahCountNextPointer]);
      setSurahCountNextPointer(prev => prev + 1);
    }
    setSurahCountGuess('');
    setSurahCountResult('');
    setIsGuessShaking(false);
    setIsInputShaking(false);
  };

  useEffect(() => {
    if (surahCountOrder.length > 0 || Number.isInteger(persistedQuizState.surahCountQuestionIndex)) return;
    createSurahCountQuestion(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedQuizState.surahCountQuestionIndex, surahCountOrder.length]);

  useEffect(() => {
    saveStoredState(SURAH_COUNT_QUIZ_STORAGE_KEY, {
      surahCountMode,
      surahCountQuestionIndex,
      surahCountOrder,
      surahCountNextPointer,
      surahCountGuess,
      surahCountInput,
      surahCountResult,
      correctCount,
      incorrectCount,
    });
  }, [
    surahCountGuess,
    surahCountInput,
    surahCountMode,
    surahCountNextPointer,
    surahCountOrder,
    surahCountQuestionIndex,
    surahCountResult,
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

  const checkSurahCountAnswer = () => {
    const guessed = Number(surahCountGuess);
    if (!Number.isInteger(guessed)) {
      setSurahCountResult('يرجى إدخال عدد آيات صحيح.');
      triggerShake(setIsGuessShaking);
      return;
    }
    const correctCount = SURAH_METADATA[surahCountQuestionIndex]?.verseCount ?? 0;
    if (guessed === correctCount) {
      setSurahCountResult('إجابة صحيحة');
      setCorrectCount(c => c + 1);
      playCorrectSound();
      setTimeout(() => {
        createSurahCountQuestion();
      }, 200);
    } else {
      setSurahCountResult(`غير صحيح. العدد الصحيح: ${correctCount}`);
      setIncorrectCount(c => c + 1);
      triggerShake(setIsGuessShaking);
    }
  };

  const findSurahsByVerseCount = () => {
    const count = Number(surahCountInput);
    if (!Number.isInteger(count) || count <= 0) {
      setSurahCountResult('يرجى إدخال عدد آيات صحيح.');
      triggerShake(setIsInputShaking);
      return;
    }
    const matches = SURAH_METADATA.filter(s => s.verseCount === count);
    if (matches.length === 0) {
      setSurahCountResult(`لا توجد سورة بهذا العدد: ${count}`);
      triggerShake(setIsInputShaking);
      return;
    }
    const names = matches.map(s => `${s.name} (${s.id})`).join('، ');
    setSurahCountResult(`السور المطابقة: ${names}`);
    playCorrectSound();
  };

  const surahCountRemaining = Math.max(0, surahCountOrder.length - surahCountNextPointer);
  const keyboard = useCustomKeyboard({
    surahCountGuess: {
      value: surahCountGuess,
      setValue: setSurahCountGuess,
      maxLength: 3,
      label: 'عدد الآيات',
      submitLabel: 'تحقق',
      onSubmit: checkSurahCountAnswer,
    },
    surahCountInput: {
      value: surahCountInput,
      setValue: setSurahCountInput,
      maxLength: 3,
      label: 'عدد الآيات',
      submitLabel: 'ابحث',
      onSubmit: findSurahsByVerseCount,
    },
  });

  return (
    <div className="khmasiyat-quiz-panel" dir="rtl">
      <h2 className="khmasiyat-quiz-title">اختبار سور - عدد آيات</h2>
      <div className="surah-count-mode-switch">
        <button type="button" className={`khmasiyat-quiz-btn secondary ${surahCountMode === 'name-to-count' ? 'active' : ''}`} onClick={() => { setSurahCountMode('name-to-count'); setSurahCountResult(''); setSurahCountInput(''); createSurahCountQuestion(); }}>اسم سورة ← عدد آيات</button>
        <button type="button" className={`khmasiyat-quiz-btn secondary ${surahCountMode === 'count-to-name' ? 'active' : ''}`} onClick={() => { setSurahCountMode('count-to-name'); setSurahCountResult(''); setSurahCountGuess(''); }}>عدد آيات ← السور</button>
      </div>

      {surahCountMode === 'name-to-count' ? (
        <>
          <div className="khmasiyat-quiz-progress" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <span>المتبقي: {surahCountRemaining}</span>
            <span style={{ color: 'var(--app-accent)' }}>صحيح: {correctCount}</span>
            <span style={{ color: 'var(--app-danger)' }}>خاطئ: {incorrectCount}</span>
            <button type="button" className="quiz-stat-reset-btn" onClick={() => { setCorrectCount(0); setIncorrectCount(0); }} title="تصفير العداد">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 5V2L7 7l5 5V8c2.97 0 5.44 2.16 5.91 5h2.02A8.004 8.004 0 0 0 12 5zm-5.91 6H4.07A8.004 8.004 0 0 0 12 19v3l5-5-5-5v3c-2.97 0-5.44-2.16-5.91-5z"/>
              </svg>
            </button>
          </div>
          <div className="khmasiyat-quiz-verse">سورة {SURAH_METADATA[surahCountQuestionIndex]?.name}</div>
          <div className="khmasiyat-quiz-inputs">
            <div className="khmasiyat-quiz-field">
              <label className="khmasiyat-quiz-label">عدد الآيات</label>
              <input
                type="text"
                value={surahCountGuess}
                placeholder="أدخل عدد الآيات"
                min="1"
                {...keyboard.getInputProps('surahCountGuess', { className: `khmasiyat-quiz-input ${isGuessShaking ? 'shake border-error' : ''}` })}
              />
            </div>
          </div>
          <div className="khmasiyat-quiz-actions">
            <button type="button" className="khmasiyat-quiz-btn" onClick={() => { keyboard.closeKeyboard(); checkSurahCountAnswer(); }}>تحقق</button>
            <button type="button" className="khmasiyat-quiz-btn secondary" onClick={() => { keyboard.closeKeyboard(); createSurahCountQuestion(); }}>سورة جديدة</button>
            <button type="button" className="khmasiyat-quiz-btn secondary" onClick={() => { keyboard.closeKeyboard(); onClose(); }}>العودة للتصفح</button>
          </div>
        </>
      ) : (
        <>
          <div className="khmasiyat-quiz-inputs">
            <div className="khmasiyat-quiz-field">
              <label className="khmasiyat-quiz-label">عدد الآيات</label>
              <input
                type="text"
                value={surahCountInput}
                placeholder="أدخل العدد"
                min="1"
                {...keyboard.getInputProps('surahCountInput', { className: `khmasiyat-quiz-input ${isInputShaking ? 'shake border-error' : ''}` })}
              />
            </div>
          </div>
          <div className="khmasiyat-quiz-actions">
            <button type="button" className="khmasiyat-quiz-btn" onClick={() => { keyboard.closeKeyboard(); findSurahsByVerseCount(); }}>ابحث</button>
            <button type="button" className="khmasiyat-quiz-btn secondary" onClick={() => { keyboard.closeKeyboard(); onClose(); }}>العودة للتصفح</button>
          </div>
        </>
      )}
      {surahCountResult && <div className="khmasiyat-quiz-result">{surahCountResult}</div>}
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
