import { useState, useEffect } from 'react';
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

  const createSurahCountQuestion = (forceNewCycle = false) => {
    const needsNewCycle = forceNewCycle || surahCountOrder.length === 0 || surahCountNextPointer >= surahCountOrder.length;
    if (needsNewCycle) {
      const newOrder = buildShuffledIndices(1, SURAH_METADATA.length);
      const firstIndex = newOrder[0] ?? 0;
      setSurahCountOrder(newOrder);
      setSurahCountNextPointer(newOrder.length > 0 ? 1 : 0);
      setSurahCountQuestionIndex(firstIndex);
    } else {
      setSurahCountQuestionIndex(surahCountOrder[surahCountNextPointer]);
      setSurahCountNextPointer(prev => prev + 1);
    }
    setSurahCountGuess('');
    setSurahCountResult('');
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
    });
  }, [
    surahCountGuess,
    surahCountInput,
    surahCountMode,
    surahCountNextPointer,
    surahCountOrder,
    surahCountQuestionIndex,
    surahCountResult,
  ]);

  const checkSurahCountAnswer = () => {
    const guessed = Number(surahCountGuess);
    if (!Number.isInteger(guessed)) {
      setSurahCountResult('يرجى إدخال عدد آيات صحيح.');
      return;
    }
    const correctCount = SURAH_METADATA[surahCountQuestionIndex]?.verseCount ?? 0;
    if (guessed === correctCount) {
      setSurahCountResult('إجابة صحيحة');
      setTimeout(() => {
        createSurahCountQuestion();
      }, 200);
    } else {
      setSurahCountResult(`غير صحيح. العدد الصحيح: ${correctCount}`);
    }
  };

  const findSurahsByVerseCount = () => {
    const count = Number(surahCountInput);
    if (!Number.isInteger(count) || count <= 0) {
      setSurahCountResult('يرجى إدخال عدد آيات صحيح.');
      return;
    }
    const matches = SURAH_METADATA.filter(s => s.verseCount === count);
    if (matches.length === 0) {
      setSurahCountResult(`لا توجد سورة بهذا العدد: ${count}`);
      return;
    }
    const names = matches.map(s => `${s.name} (${s.id})`).join('، ');
    setSurahCountResult(`السور المطابقة: ${names}`);
  };

  const surahCountRemaining = Math.max(0, surahCountOrder.length - surahCountNextPointer);

  return (
    <div className="khmasiyat-quiz-panel" dir="rtl">
      <h2 className="khmasiyat-quiz-title">اختبار سور - عدد آيات</h2>
      <div className="surah-count-mode-switch">
        <button type="button" className={`khmasiyat-quiz-btn secondary ${surahCountMode === 'name-to-count' ? 'active' : ''}`} onClick={() => { setSurahCountMode('name-to-count'); setSurahCountResult(''); setSurahCountInput(''); createSurahCountQuestion(); }}>اسم سورة ← عدد آيات</button>
        <button type="button" className={`khmasiyat-quiz-btn secondary ${surahCountMode === 'count-to-name' ? 'active' : ''}`} onClick={() => { setSurahCountMode('count-to-name'); setSurahCountResult(''); setSurahCountGuess(''); }}>عدد آيات ← السور</button>
      </div>

      {surahCountMode === 'name-to-count' ? (
        <>
          <div className="khmasiyat-quiz-progress">المتبقي حتى إنهاء جميع السور: {surahCountRemaining}</div>
          <div className="khmasiyat-quiz-verse">سورة {SURAH_METADATA[surahCountQuestionIndex]?.name}</div>
          <div className="khmasiyat-quiz-inputs"><div className="khmasiyat-quiz-field"><label className="khmasiyat-quiz-label">عدد الآيات</label><input type="number" className="khmasiyat-quiz-input" value={surahCountGuess} onChange={(e) => setSurahCountGuess(e.target.value)} placeholder="أدخل عدد الآيات" min="1" /></div></div>
          <div className="khmasiyat-quiz-actions"><button type="button" className="khmasiyat-quiz-btn" onClick={checkSurahCountAnswer}>تحقق</button><button type="button" className="khmasiyat-quiz-btn secondary" onClick={() => createSurahCountQuestion()}>سورة جديدة</button><button type="button" className="khmasiyat-quiz-btn secondary" onClick={onClose}>العودة للتصفح</button></div>
        </>
      ) : (
        <>
          <div className="khmasiyat-quiz-inputs"><div className="khmasiyat-quiz-field"><label className="khmasiyat-quiz-label">عدد الآيات</label><input type="number" className="khmasiyat-quiz-input" value={surahCountInput} onChange={(e) => setSurahCountInput(e.target.value)} placeholder="أدخل العدد" min="1" /></div></div>
          <div className="khmasiyat-quiz-actions"><button type="button" className="khmasiyat-quiz-btn" onClick={findSurahsByVerseCount}>ابحث</button><button type="button" className="khmasiyat-quiz-btn secondary" onClick={onClose}>العودة للتصفح</button></div>
        </>
      )}
      {surahCountResult && <div className="khmasiyat-quiz-result">{surahCountResult}</div>}
    </div>
  );
}
