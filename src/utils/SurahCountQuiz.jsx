import { useState, useEffect } from 'react';
import { SURAH_METADATA } from '../data/quranConstants';
import { buildShuffledIndices } from './quizUtils';

export default function SurahCountQuiz({ onClose }) {
  const [surahCountMode, setSurahCountMode] = useState('name-to-count');
  const [surahCountQuestionIndex, setSurahCountQuestionIndex] = useState(0);
  const [surahCountOrder, setSurahCountOrder] = useState([]);
  const [surahCountNextPointer, setSurahCountNextPointer] = useState(0);
  const [surahCountGuess, setSurahCountGuess] = useState('');
  const [surahCountInput, setSurahCountInput] = useState('');
  const [surahCountResult, setSurahCountResult] = useState('');

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
    createSurahCountQuestion(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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