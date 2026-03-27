import { useEffect, useRef, useState } from 'react';
import { PAGE_STARTS } from '../data/pageStarts';
import TextDisplay from '../components/TextDisplay';
import { buildShuffledIndices } from './quizUtils';

export default function PageStartsQuiz({ onClose }) {
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState('604');
  const [order, setOrder] = useState([]);
  const [nextPointer, setNextPointer] = useState(0);
  const [orderRange, setOrderRange] = useState({ start: 1, end: 604 });
  const [currentIndex, setCurrentIndex] = useState(null);
  const [result, setResult] = useState('');
  const [pageGuess, setPageGuess] = useState('');
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
    } else {
      setCurrentIndex(order[nextPointer]);
      setNextPointer((prev) => prev + 1);
    }

    setPageGuess('');
    setIsGuessShaking(false);
    setResult('');
  };

  useEffect(() => {
    applyRange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      playCorrectSound();
      setTimeout(() => applyRange(false), 200);
    } else {
      setResult(`غير صحيح. الصفحة: ${verse.page}`);
      triggerGuessShake();
    }
  };

  return (
    <div className="khmasiyat-quiz-panel" dir="rtl">
      <h2 className="khmasiyat-quiz-title">اختبار بدايات صفحات</h2>

      <div className="khmasiyat-quiz-range">
        <span className="khmasiyat-range-label">من</span>
        <input
          type="number"
          className="khmasiyat-quiz-input khmasiyat-range-input"
          value={rangeStart}
          onChange={(e) => setRangeStart(e.target.value)}
          placeholder="1"
          min="1"
          max="604"
          aria-label="من"
        />
        <span className="khmasiyat-range-label">إلى</span>
        <input
          type="number"
          className="khmasiyat-quiz-input khmasiyat-range-input"
          value={rangeEnd}
          onChange={(e) => setRangeEnd(e.target.value)}
          placeholder="604"
          min="1"
          max="604"
          aria-label="إلى"
        />
        <button type="button" className="khmasiyat-quiz-btn secondary khmasiyat-range-apply" onClick={() => applyRange(true)}>
          تطبيق
        </button>
      </div>

      <div className="khmasiyat-quiz-progress">متبقية: {remaining}</div>

      {verse ? (
        <TextDisplay verses={[verse]} hideVerseNumber />
      ) : (
        <div className="verse-container">اختر مدى صحيحًا ثم اضغط "تطبيق".</div>
      )}

      <div className="page-starts-quiz-check">
        <div className={`input-inner-wrapper ${isGuessShaking ? 'shake border-error' : ''}`}>
          <input
            type="number"
            className="jump-input"
            value={pageGuess}
            onChange={(e) => setPageGuess(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
            placeholder="1"
            min="1"
            max="604"
            dir="ltr"
            aria-label="page number"
          />
        </div>
        <button type="button" className="khmasiyat-quiz-btn" onClick={checkAnswer}>
          تحقق
        </button>
      </div>

      <div className="khmasiyat-quiz-actions">
        <button type="button" className="khmasiyat-quiz-btn secondary" onClick={onClose}>
          عودة
        </button>
      </div>

      {result && <div className="khmasiyat-quiz-result">{result}</div>}
    </div>
  );
}
