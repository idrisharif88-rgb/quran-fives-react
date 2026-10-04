import useVerseAudio from '../../hooks/useVerseAudio';
import { stepTarget, stepCount } from '../../utils/hifzSteps';

// أداة سماع المقرئ: كل تلاوة كاملة لورد اليوم (آياته كلّها) تُحسب مرة
function ListenTool({ verses, reciter, value, target, onCount }) {
  const audio = useVerseAudio({ verses, reciter, onFinished: () => onCount(1) });
  const playing = audio.status === 'playing' || audio.status === 'loading';
  return (
    <div className="hifz-tool">
      <button type="button" className="hifz-btn primary" onClick={playing ? audio.stop : audio.play}>
        {audio.status === 'loading' ? 'جارٍ التحميل…' : playing ? 'إيقاف' : 'تشغيل التلاوة'}
      </button>
      <span className="hifz-tool-count" dir="ltr">{value} / {target}</span>
      {audio.status === 'error' && <span className="hifz-tool-error">تعذّر تشغيل التلاوة — تحقّق من الإنترنت</span>}
    </div>
  );
}

// عدّاد التكرار: ضغطة تزيد، مع إنقاص وتصفير — عدّاد بسيط خاص بالحفظ.
// بلوغ الهدف لا يُتمّ الخطوة: يظهر زرّ تأكيد، فضغطة خاطئة تُصحَّح بالإنقاص قبله.
function RepeatTool({ value, target, onCount, onConfirm }) {
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
      {reached && (
        <button type="button" className="hifz-btn primary hifz-confirm" onClick={onConfirm}>تم — أكملت التكرار</button>
      )}
    </>
  );
}

/**
 * أداة الخطوة المفتوحة. كل خطوة جديدة تُضاف إلى القواعد تحتاج أداتها هنا.
 * @param verses آيات ورد اليوم [{ s, a }]
 * @param extras أدوات تُحقن من الشاشة: hafizContacts (خطّ التواصل مع الشيخ) و recorder (التسجيل)
 */
export default function HifzStepTool({ id, value, rules, verses, reciter, actions, extras = {} }) {
  if (id === 'listen') {
    return <ListenTool verses={verses} reciter={reciter} value={value} target={stepTarget(id, rules)} onCount={(d) => actions.count(id, d)} />;
  }
  if (id === 'repeat') {
    return <RepeatTool value={stepCount(id, value)} target={stepTarget(id, rules)} onCount={(d) => actions.count(id, d)} onConfirm={() => actions.confirm(id)} />;
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
  return (
    <div className="hifz-tool">
      <button type="button" className="hifz-btn primary" onClick={() => actions.tick(id)}>تم</button>
    </div>
  );
}
