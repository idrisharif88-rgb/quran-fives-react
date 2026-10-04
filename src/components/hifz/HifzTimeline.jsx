import { QURAN_VERSES } from '../../data/quranVerses';
import { verseRanges } from '../../utils/hifzSchedule';
import { isStepDone } from '../../utils/hifzSteps';
import HifzStepTool from './HifzStepTool';
import { STEP_TEXT, BOX_TEXT, boxTitle, rangesText, refsText, isMulti } from './hifzText';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7" /></svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6z"/></svg>
);

// بند في الخط الزمني: دائرة حالته على الخط، ثم عنوانه ومحتواه
function Item({ state, number, title, hint, children }) {
  return (
    <li className={`hifz-item ${state}`}>
      <span className="hifz-node">{state === 'done' ? <CheckIcon /> : state === 'locked' ? <LockIcon /> : number}</span>
      <div className="hifz-item-body">
        <div className="hifz-item-title">{title}</div>
        {hint && <div className="hifz-item-hint">{hint}</div>}
        {children}
      </div>
    </li>
  );
}

/**
 * الخط الزمني ليوم واحد: خطوات الآية الجديدة (مقفلة بالتسلسل) ثم صناديق المراجعة
 * (مفتوحة في أي وقت، شكّ واحد لكل صندوق بلا أدوات).
 */
export default function HifzTimeline({ program, plan, reciter, actions, extras }) {
  const { rules } = program;
  const verse = plan.verse;
  const multi = isMulti(rules);
  // نصّ ورد اليوم: الآية وحدها، أو الآيات متتالية وبعد كلٍّ رقمها
  const texts = (verse?.refs ?? []).filter(Boolean).map((ref) => ({
    ref,
    text: QURAN_VERSES.find((v) => v.s === ref.s && v.a === ref.a)?.t,
  }));
  const verseText = texts.length > 1
    ? texts.map(({ ref, text }) => `${text} ﴿${ref.a}﴾`).join(' ')
    : texts[0]?.text ?? null;

  return (
    <div className="hifz-timeline">
      {verse && (
        <section className="hifz-section">
          <h3 className="hifz-section-title">
            {multi ? 'آيات اليوم' : 'آية اليوم'}{verse.done ? ' — تم حفظها' : ''}
            <span>{refsText(verse.refs.filter(Boolean))}</span>
          </h3>
          {/* التكرار من الحفظ: نصّ الآية يختفي فور إتمام خطوة التسجيل */}
          {plan.openStep === 'repeat'
            ? <p className="hifz-verse hidden">{multi ? 'الآيات مخفية — كرّرها من حفظك' : 'الآية مخفية — كرّرها من حفظك'}</p>
            : <p className="hifz-verse">{verseText}</p>}
          {!verse.done && (
            <ol className="hifz-list">
              {rules.steps.map((id, i) => {
                const done = isStepDone(id, program.progress[id], rules);
                const state = done ? 'done' : plan.openStep === id ? 'open' : 'locked';
                return (
                  <Item key={id} state={state} number={i + 1} title={STEP_TEXT[id].title} hint={state === 'done' ? null : STEP_TEXT[id].hint(rules)}>
                    {state === 'open' && (
                      <HifzStepTool id={id} value={program.progress[id]} rules={rules} verses={verse.refs} reciter={reciter} actions={actions} extras={extras} />
                    )}
                  </Item>
                );
              })}
            </ol>
          )}
          {verse.done && <p className="hifz-done-note">{multi ? 'الورد التالي يُفتح غداً.' : 'الآية التالية تُفتح غداً.'}</p>}
        </section>
      )}

      {plan.boxItems.length > 0 && (
        <section className="hifz-section">
          <h3 className="hifz-section-title">المراجعة</h3>
          <ol className="hifz-list">
            {plan.boxItems.map((item) => (
              <Item
                key={item.box}
                state={item.done ? 'done' : 'open'}
                number="•"
                title={`${boxTitle(item.box, rules)} (${item.indices.length})`}
                hint={BOX_TEXT[item.box].hint(rules)}
              >
                <div className="hifz-ranges">{rangesText(verseRanges(program.direction, item.indices))}</div>
                <button
                  type="button"
                  className={`hifz-btn ${item.done ? '' : 'primary'}`.trim()}
                  onClick={() => actions.checkBox(item.box, !item.done)}
                >
                  {item.done ? 'تراجع' : 'قرأتها'}
                </button>
              </Item>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
