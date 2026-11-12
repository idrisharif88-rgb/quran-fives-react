import { useState } from 'react';
import { stepState, STEP_STATE } from '../../utils/hifzSteps';
import HifzStepTool from './HifzStepTool';
import { STEP_TEXT } from './hifzText';
import './HifzSteps.css';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7" /></svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6z" /></svg>
);
const RedoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9" /><path d="M4 4v5h5" /></svg>
);
// السهم بحسب اتجاه القراءة: السابق إلى اليمين والتالي إلى اليسار
const Arrow = ({ next }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={next ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} /></svg>
);

const STATE_LABEL = { [STEP_STATE.DONE]: 'تمّت', [STEP_STATE.OPEN]: 'خطوتك الآن', [STEP_STATE.LOCKED]: 'مقفلة' };

/**
 * خطوات ورد اليوم: خطوة واحدة معروضة، يُتنقَّل بينها بالسهمين أو بدوائر الشريط.
 * التنقّل عرضٌ فقط: الخطوة المقفلة تُرى ولا تُؤدّى، والترتيب ملزم كما كان.
 * الخطوة المنجزة تُعاد من زرّ صغير بعد تأكيد (actions.redo) فتصير هي المفتوحة.
 * يُعاد تركيب المكوّن مع تغيّر الخطوة المفتوحة (key عند المستدعي) فيتبعها العرض.
 * @param busy تسجيل جارٍ أو طريقة الخماسيات مفتوحة: لا تنقّل حتى ينتهي
 * @param trial وضع التجربة: زرّ «تخطَّ» في الخطوة المفتوحة
 */
export default function HifzSteps({ program, plan, reciter, actions, extras, verses, busy = false, trial = false }) {
  const { rules, progress } = program;
  const steps = rules.steps;
  const openIndex = Math.max(0, steps.indexOf(plan.openStep));
  const [view, setView] = useState(openIndex);
  const [asking, setAsking] = useState(false);
  const id = steps[view];
  const state = stepState(id, progress, rules);
  const go = (index) => { setView(index); setAsking(false); };

  return (
    <div className="hifz-steps">
      <div className="hifz-steps-strip">
        <button type="button" className="hifz-steps-arrow" onClick={() => go(view - 1)} disabled={busy || view === 0} aria-label="الخطوة السابقة"><Arrow /></button>
        <ol className="hifz-steps-dots">
          {steps.map((stepId, i) => {
            const dot = stepState(stepId, progress, rules);
            return (
              <li key={stepId}>
                <button
                  type="button"
                  className={`hifz-steps-dot ${dot} ${i === view ? 'view' : ''}`.trim()}
                  onClick={() => go(i)}
                  disabled={busy}
                  aria-label={`${STEP_TEXT[stepId].title} — ${STATE_LABEL[dot]}`}
                  aria-current={i === view ? 'step' : undefined}
                >
                  {dot === STEP_STATE.DONE ? <CheckIcon /> : dot === STEP_STATE.LOCKED ? <LockIcon /> : i + 1}
                </button>
              </li>
            );
          })}
        </ol>
        <button type="button" className="hifz-steps-arrow" onClick={() => go(view + 1)} disabled={busy || view === steps.length - 1} aria-label="الخطوة التالية"><Arrow next /></button>
      </div>

      <div className="hifz-steps-head">
        <strong>{view + 1}. {STEP_TEXT[id].title}</strong>
        <span className="hifz-steps-side">
          <span className={`hifz-steps-state ${state}`}>{STATE_LABEL[state]}</span>
          {state === STEP_STATE.DONE && !asking && (
            <button type="button" className="hifz-steps-redo" onClick={() => setAsking(true)} aria-label={`أعد خطوة ${STEP_TEXT[id].title}`} title="أعد الخطوة"><RedoIcon /></button>
          )}
        </span>
      </div>
      <p className="hifz-steps-hint">{STEP_TEXT[id].hint(rules)}</p>

      {state === STEP_STATE.OPEN && (
        <HifzStepTool id={id} value={progress[id]} rules={rules} verses={verses} reciter={reciter} actions={actions} extras={extras} />
      )}
      {state === STEP_STATE.OPEN && trial && (
        <button type="button" className="hifz-skip" onClick={actions.skip}>تخطَّ ←</button>
      )}

      {state === STEP_STATE.DONE && asking && (
        <div className="hifz-steps-ask" role="alertdialog" aria-label="تأكيد إعادة الخطوة">
          <span>إعادة «{STEP_TEXT[id].title}»؟ يُمسح ما أُنجز فيها وحدها.</span>
          <div>
            <button type="button" className="hifz-btn primary" onClick={() => actions.redo(id)}>أعدها</button>
            <button type="button" className="hifz-btn" onClick={() => setAsking(false)}>تراجع</button>
          </div>
        </div>
      )}

      {state === STEP_STATE.LOCKED && (
        <p className="hifz-steps-locked">تُفتح بعد إتمام «{STEP_TEXT[steps[openIndex]].title}».</p>
      )}
      {view !== openIndex && (
        <button type="button" className="hifz-link hifz-steps-back" onClick={() => go(openIndex)}>
          عُد إلى خطوتك: {STEP_TEXT[steps[openIndex]].title}
        </button>
      )}
    </div>
  );
}
