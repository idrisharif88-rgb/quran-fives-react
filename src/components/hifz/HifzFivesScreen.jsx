import { useState, useEffect } from 'react';
import { METHOD_REPS, methodPosition } from '../../utils/hifzMethod';
import { stageTitle, stageMessage, withCheer, ASK, RETRY, DONE } from '../../constants/hifzFivesMessages';
import useSpeech from '../../hooks/useSpeech';
import HifzMushafVerses from './HifzMushafVerses';
import { refsText } from './hifzText';
import './HifzFivesScreen.css';

// الرسالة الجارية: الإتمام، أو السؤال، أو بعد «لا»، أو المرحلة (بتشجيع بعد «نعم»)
function messageFor({ done, asking, answer, stage, stageIndex, count }) {
  if (done) return DONE;
  if (asking) return ASK;
  if (answer === 'no') return RETRY;
  const message = stageMessage(stage, count);
  return answer === 'yes' ? withCheer(stageIndex, message) : message;
}

/**
 * نافذة «طريقة الخماسيات» الكاملة: تقود الحافظ مرحلةً مرحلة برسالة كبيرة منطوقة،
 * وعدّاد كبير بلمسة، وبعد كل خمس سؤال «هل حفظك جيد؟» (لا ← خمس أخرى، نعم ← التالية).
 * الآيات مخفية، و«أرني الآية» يُظهر آيات المرحلة.
 * @param refs    آيات الورد [{ s, a }]
 * @param method  { taps, checked } من useHifz
 * @param onTap   (delta | 'reset')، onAnswer (نعم: true)، onDone يُتمّ الخطوة، onClose يغلق النافذة
 */
export default function HifzFivesScreen({ refs, method, onTap, onAnswer, onDone, onClose }) {
  const [answer, setAnswer] = useState(null);  // آخر جواب: 'yes' | 'no'
  const [peek, setPeek] = useState(false);
  const voice = useSpeech();
  const { speak } = voice;

  const { done, asking, stage, stageIndex, stageCount, rep } = methodPosition(refs.length, method.taps, method.checked);
  const stageRefs = refs.slice(stage.from, stage.to + 1);

  const message = messageFor({ done, asking, answer, stage, stageIndex, count: refs.length });

  // كل رسالة جديدة تُنطق مرة (المفتاح نصّها، فإعادة الرسم لا تعيدها)
  const { text } = message;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { speak(message); }, [text, speak]);

  const reply = (good) => {
    setAnswer(good ? 'yes' : 'no');
    setPeek(false);
    onAnswer(good);
  };

  return (
    <div className="hifz-fives" dir="rtl" role="dialog" aria-label="طريقة الخماسيات">
      <div className="hifz-fives-top">
        <button type="button" className="hifz-fives-icon" onClick={onClose} aria-label="إغلاق الطريقة">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
        </button>
        <div className="hifz-fives-dots" aria-label={`المرحلة ${stageIndex + 1} من ${stageCount}`}>
          {Array.from({ length: stageCount }, (_, i) => (
            <span key={i} className={i < method.checked || done ? 'done' : i === stageIndex ? 'now' : ''} />
          ))}
        </div>
        <button type="button" className="hifz-fives-icon" onClick={voice.toggle} aria-label={voice.on ? 'إيقاف الصوت' : 'تشغيل الصوت'}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
            {voice.on
              ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
              : <path d="m16 9 5 5m0-5-5 5" />}
          </svg>
        </button>
      </div>

      <div className="hifz-fives-card">
        <h2>{done ? 'أتممت الورد' : stageTitle(stage, refs.length)}</h2>
        <p>{message.text}</p>
        {voice.on && <button type="button" className="hifz-fives-replay" onClick={() => speak(message)}>أعد الرسالة</button>}
      </div>

      <div className="hifz-fives-verse">
        <span className="hifz-fives-refs">{refsText(stageRefs)}</span>
        {peek ? (
          <>
            <div className="hifz-verse mushaf"><HifzMushafVerses refs={stageRefs} /></div>
            <button type="button" className="hifz-fives-peek" onClick={() => setPeek(false)}>أخفِ الآية</button>
          </>
        ) : (
          <button type="button" className="hifz-fives-peek" onClick={() => setPeek(true)}>أرني الآية</button>
        )}
      </div>

      {done ? (
        <button type="button" className="hifz-fives-finish" onClick={onDone}>تم — أكملت الحفظ</button>
      ) : asking ? (
        <div className="hifz-fives-ask">
          <button type="button" className="yes" onClick={() => reply(true)}>نعم</button>
          <button type="button" className="no" onClick={() => reply(false)}>لا</button>
        </div>
      ) : (
        <div className="hifz-fives-counter">
          <button type="button" className="hifz-fives-tap" onClick={() => onTap(1)} aria-label="زيادة العدّاد">
            <strong dir="ltr">{rep}</strong>
            <span className="hifz-fives-pips" aria-hidden="true">
              {Array.from({ length: METHOD_REPS }, (_, i) => <i key={i} className={i < rep ? 'on' : ''} />)}
            </span>
          </button>
          <div className="hifz-fives-side">
            <button type="button" onClick={() => onTap(-1)} disabled={rep === 0}>− ١</button>
            <button type="button" onClick={() => onTap('reset')} disabled={method.taps === 0}>من الأوّل</button>
          </div>
        </div>
      )}
    </div>
  );
}
