import { useState, useEffect } from 'react';
import { getSurahAndRange } from './quranLogic';
import { QURAN_VERSES } from '../data/quranVerses';
import { buildShuffledIndices } from './quizUtils';

export default function KhmasiyatQuiz({ onClose }) {
  const [quizKhmasiyaIndex, setQuizKhmasiyaIndex] = useState(null);
  const [quizFiveInSurahGuess, setQuizFiveInSurahGuess] = useState('');
  const [quizSurahGuess, setQuizSurahGuess] = useState('');
  const [quizRangeStart, setQuizRangeStart] = useState('1');
  const [quizRangeEnd, setQuizRangeEnd] = useState('1202');
  const [quizOrder, setQuizOrder] = useState([]);
  const [quizNextPointer, setQuizNextPointer] = useState(0);
  const [quizOrderRange, setQuizOrderRange] = useState({ start: 1, end: 1202 });
  const [quizResult, setQuizResult] = useState('');

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
    setQuizResult('');
  };

  // Initialize exactly once when mounted
  useEffect(() => {
    createKhmasiyatQuestion(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkKhmasiyatAnswer = () => {
    if (quizKhmasiyaIndex === null) {
      setQuizResult('لا يوجد سؤال حالي. اختر المدى ثم اضغط "تطبيق المدى".');
      return;
    }
    const guessedFiveInSurah = Number(quizFiveInSurahGuess);
    const guessedSurah = Number(quizSurahGuess);
    if (!Number.isInteger(guessedFiveInSurah) || !Number.isInteger(guessedSurah)) {
      setQuizResult('يرجى إدخال رقم الخماسية داخل السورة ورقم السورة.');
      return;
    }
    
    const quizKhmasiyaData = getSurahAndRange(quizKhmasiyaIndex);
    const correctFiveInSurah = quizKhmasiyaData?.end ?? 0;
    const correctSurah = quizKhmasiyaData.surah;
    
    if (guessedFiveInSurah === correctFiveInSurah && guessedSurah === correctSurah) {
      setQuizResult('إجابة صحيحة');
      setTimeout(() => {
        createKhmasiyatQuestion();
      }, 200);
    } else {
      setQuizResult(`غير صحيح. الخماسية داخل السورة: ${correctFiveInSurah} | السورة: ${correctSurah}`);
    }
  };

  const quizKhmasiyaData = quizKhmasiyaIndex !== null ? getSurahAndRange(quizKhmasiyaIndex) : null;
  const quizLastVerse = quizKhmasiyaData ? QURAN_VERSES[quizKhmasiyaData.absoluteEndIndex - 1] : null;
  const quizRemainingCount = Math.max(0, quizOrder.length - quizNextPointer);

  return (
    <div className="khmasiyat-quiz-panel" dir="rtl">
      <h2 className="khmasiyat-quiz-title">اختبار خماسيات</h2>
      <div className="khmasiyat-quiz-range">
        <div className="khmasiyat-quiz-field">
          <label className="khmasiyat-quiz-label">من خماسية</label>
          <input type="number" className="khmasiyat-quiz-input" value={quizRangeStart} onChange={(e) => setQuizRangeStart(e.target.value)} placeholder="1" min="1" max="1202" />
        </div>
        <div className="khmasiyat-quiz-field">
          <label className="khmasiyat-quiz-label">إلى خماسية</label>
          <input type="number" className="khmasiyat-quiz-input" value={quizRangeEnd} onChange={(e) => setQuizRangeEnd(e.target.value)} placeholder="1202" min="1" max="1202" />
        </div>
        <button type="button" className="khmasiyat-quiz-btn secondary khmasiyat-range-apply" onClick={() => createKhmasiyatQuestion(true)}>تطبيق المدى</button>
      </div>
      <div className="khmasiyat-quiz-progress">المتبقي حتى إنهاء المدى: {quizRemainingCount}</div>
      <div className="khmasiyat-quiz-verse">{quizLastVerse?.t || 'اختر مدى صحيحًا ثم اضغط "تطبيق المدى" لعرض سؤال عشوائي.'}</div>
      <div className="khmasiyat-quiz-inputs">
        <div className="khmasiyat-quiz-field"><label className="khmasiyat-quiz-label">رقم السورة</label><input type="number" className="khmasiyat-quiz-input" value={quizSurahGuess} onChange={(e) => setQuizSurahGuess(e.target.value)} placeholder="من 1 إلى 114" min="1" max="114" /></div>
        <div className="khmasiyat-quiz-field"><label className="khmasiyat-quiz-label">الخماسية داخل السورة</label><input type="number" className="khmasiyat-quiz-input" value={quizFiveInSurahGuess} onChange={(e) => setQuizFiveInSurahGuess(e.target.value)} placeholder="مثال: 5 أو 10 أو 15" min="5" /></div>
      </div>
      <div className="khmasiyat-quiz-actions"><button type="button" className="khmasiyat-quiz-btn" onClick={checkKhmasiyatAnswer}>تحقق</button><button type="button" className="khmasiyat-quiz-btn secondary" onClick={createKhmasiyatQuestion}>خماسية جديدة</button><button type="button" className="khmasiyat-quiz-btn secondary" onClick={onClose}>العودة للتصفح</button></div>
      {quizResult && <div className="khmasiyat-quiz-result">{quizResult}</div>}
    </div>
  );
}