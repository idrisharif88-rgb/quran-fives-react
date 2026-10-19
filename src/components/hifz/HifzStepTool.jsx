import { useEffect, useRef, useState } from 'react';
import useVerseAudio from '../../hooks/useVerseAudio';
import { stepTarget, stepCount } from '../../utils/hifzSteps';
import HifzListenTimes from './HifzListenTimes';
import HifzRepeatTarget from './HifzRepeatTarget';

// أداة سماع المقرئ: كل تلاوة كاملة لورد اليوم (آياته كلّها) تُحسب مرة. ضغطة تشغيل واحدة
// تعيد التلاوة وحدها حتى يبلغ العدد المختار (3 أو 5 أو 7) فتتمّ الخطوة. تغيير المقرئ أثناءها
// يعيد التلاوة الجارية بصوت الجديد ويكمل العدّ. العدد يُختار من خانة صغيرة بجانب الزرّ.
const REPLAY_GAP_MS = 900;

function ListenTool({ verses, reciter, value, target, onCount, onTarget, reciterSelect, backRef }) {
  const autoRef = useRef(false);   // تشغيل متتابع جارٍ (أوقفه صاحبه أو انتهى ← false)
  const [auto, setAutoState] = useState(false);   // للعرض: الزرّ «إيقاف» حتى في الفاصل بين تلاوتين
  const [heard, setHeard] = useState(false);       // بدأت أول تلاوة: «جارٍ التحميل…» لا يعود بين الجولات
  const setAuto = (on) => { autoRef.current = on; setAutoState(on); };
  const timerRef = useRef(null);
  const playRef = useRef(null);
  const audio = useVerseAudio({
    verses,
    reciter,
    onFinished: () => {
      onCount(1);
      if (!autoRef.current || value + 1 >= target) { setAuto(false); return; }
      timerRef.current = setTimeout(() => playRef.current?.(), REPLAY_GAP_MS);
    },
  });
  useEffect(() => { playRef.current = audio.play; }, [audio.play]);

  // تغيير المقرئ أثناء التشغيل المتتابع: يُعاد بالصوت الجديد
  useEffect(() => {
    if (!autoRef.current) return;
    clearTimeout(timerRef.current);
    audio.play();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciter]);

  useEffect(() => () => clearTimeout(timerRef.current), []);
  if (audio.status === 'error' && auto) setAuto(false);
  if (audio.status === 'playing' && !heard) setHeard(true);

  const start = () => { setHeard(false); setAuto(true); audio.play(); };
  const stop = () => { setAuto(false); clearTimeout(timerRef.current); audio.stop(); };
  const playing = auto || audio.status === 'playing' || audio.status === 'loading';
  return (
    <div className="hifz-tool">
      <button type="button" className="hifz-btn primary" onClick={playing ? stop : start}>
        {audio.status === 'loading' && !heard ? 'جارٍ التحميل…' : playing ? 'إيقاف' : 'تشغيل التلاوة'}
      </button>
      {playing && heard && (
        <span className="hifz-listen-count">{Math.min(value + 1, target)} من {target} · بقي {Math.max(0, target - value - 1)}</span>
      )}
      <HifzListenTimes value={target} onChange={onTarget} backRef={backRef} />
      {reciterSelect}
      {audio.status === 'error' && <span className="hifz-tool-error">تعذّر تشغيل التلاوة — تحقّق من الإنترنت</span>}
    </div>
  );
}

// عدّاد التكرار: ضغطة تزيد، مع إنقاص وتصفير — عدّاد بسيط خاص بالحفظ.
// بلوغ الهدف لا يُتمّ الخطوة: يظهر زرّ تأكيد، فضغطة خاطئة تُصحَّح بالإنقاص قبله.
// العدد نفسه (1–100) يضبطه الحافظ تحت العدّاد.
function RepeatTool({ value, target, onCount, onConfirm, onTarget }) {
  const reached = value >= target;
  return (
    <>
      <div className="hifz-counter">
        <button type="button" className={`hifz-counter-tap ${reached ? 'reached' : ''}`.trim()} onClick={() => onCount(1)} disabled={reached} aria-label="زيادة العدّاد">
          <strong dir="ltr">{value}</strong>
          <span dir="ltr">/ {target}</span>
        </button>
        <div className="hifz-counter-side">
          <button type="button" className="hifz-btn" onClick={() => onCount(-1)} disabled={value === 0}>− ١</button>
          <button type="button" className="hifz-btn" onClick={() => onCount('reset')} disabled={value === 0}>تصفير</button>
        </div>
      </div>
      <HifzRepeatTarget value={target} onChange={onTarget} />
      {reached && (
        <button type="button" className="hifz-btn primary hifz-confirm" onClick={onConfirm}>تم — أكملت التكرار</button>
      )}
    </>
  );
}

/**
 * أداة الخطوة المفتوحة. كل خطوة جديدة تُضاف إلى القواعد تحتاج أداتها هنا.
 * @param verses آيات ورد اليوم [{ s, a }]
 * @param extras أدوات تُحقن من الشاشة: backRef (زرّ الرجوع)، reciterSelect (اختيار المقرئ)، method (طريقة الخماسيات)، hafizContacts (خطّ التواصل مع الشيخ)، recorder (التسجيل)
 */
export default function HifzStepTool({ id, value, rules, verses, reciter, actions, extras = {} }) {
  if (id === 'listen') {
    return <ListenTool verses={verses} reciter={reciter} value={stepCount(id, value)} target={stepTarget(id, rules)} onCount={(d) => actions.count(id, d)} onTarget={actions.setListenTarget} reciterSelect={extras.reciterSelect} backRef={extras.backRef} />;
  }
  if (id === 'repeat') {
    return <RepeatTool value={stepCount(id, value)} target={stepTarget(id, rules)} onCount={(d) => actions.count(id, d)} onConfirm={() => actions.confirm(id)} onTarget={actions.setRepeatTarget} />;
  }
  if (id === 'hafiz') {
    return (
      <div className="hifz-tool">
        {extras.hafizContacts}
        <button type="button" className="hifz-btn primary" onClick={() => actions.tick(id)}>أكّد الشيخ صحة قراءتي</button>
      </div>
    );
  }
  if (id === 'record') {
    return extras.recorder ?? null;
  }
  if (id === 'memorize' && extras.method) {
    return extras.method;
  }
  return (
    <div className="hifz-tool">
      <button type="button" className="hifz-btn primary" onClick={() => actions.tick(id)}>تم</button>
    </div>
  );
}
