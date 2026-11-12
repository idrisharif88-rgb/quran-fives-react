import { verseRanges } from '../../utils/hifzSchedule';
import HifzSteps from './HifzSteps';
import HifzVerseText from './HifzVerseText';
import { BOX_TEXT, boxTitle, rangesText, refsText, isMulti } from './hifzText';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7" /></svg>
);

// بند في الخط الزمني: دائرة حالته على الخط، ثم عنوانه ومحتواه
function Item({ state, number, title, hint, children }) {
  return (
    <li className={`hifz-item ${state}`}>
      <span className="hifz-node">{state === 'done' ? <CheckIcon /> : number}</span>
      <div className="hifz-item-body">
        <div className="hifz-item-title">{title}</div>
        {hint && <div className="hifz-item-hint">{hint}</div>}
        {children}
      </div>
    </li>
  );
}

/**
 * الخط الزمني ليوم واحد: خطوات الآية الجديدة (HifzSteps: مقفلة بالتسلسل، يُتنقَّل بينها
 * للعرض) ثم صناديق المراجعة (مفتوحة في أي وقت، شكّ واحد لكل صندوق بلا أدوات).
 * @param cover 'recording' | 'method' | null — تسجيل جارٍ أو طريقة الخماسيات مفتوحة: نصّ الورد يُغطّى
 * @param trial وضع التجربة: زرّ «تخطَّ» في الخطوة المفتوحة يُتمّها فوراً
 * @param canTakeExtra المشرف ومن أذن له (hifzExtraPortion): بعد إتمام اليوم يُعرض زرّ يفتح ورد الغد في اليوم نفسه
 */
export default function HifzTimeline({ program, plan, reciter, actions, extras, cover = null, trial = false, canTakeExtra = false }) {
  const { rules } = program;
  const verse = plan.verse;
  const multi = isMulti(rules);

  return (
    <div className="hifz-timeline">
      {verse && (
        <section className="hifz-section">
          <h3 className="hifz-section-title">
            {multi ? 'آيات اليوم' : 'آية اليوم'}{verse.done ? ' — تم حفظها' : ''}
            <span>{refsText(verse.refs.filter(Boolean))}</span>
          </h3>
          {/* التكرار من الحفظ: نصّ الآية يختفي فور إتمام خطوة التسجيل. وكذلك أثناء التسجيل. */}
          <HifzVerseText key={cover || 'idle'} refs={verse.refs.filter(Boolean)} multi={multi} repeat={plan.openStep === 'repeat'} cover={cover} />
          {!verse.done && (
            <HifzSteps
              key={plan.openStep}
              program={program}
              plan={plan}
              reciter={reciter}
              actions={actions}
              extras={extras}
              verses={verse.refs}
              busy={Boolean(cover)}
              trial={trial}
            />
          )}
          {verse.done && <p className="hifz-done-note">{multi ? 'الورد التالي يُفتح غداً.' : 'الآية التالية تُفتح غداً.'}</p>}
          {verse.done && canTakeExtra && (
            <button type="button" className="hifz-btn hifz-extra" onClick={actions.extraPortion} disabled={!plan.complete}>
              {plan.complete ? 'افتح ورد الغد الآن (يوم جديد بمراجعته)' : 'أتمّ مراجعة اليوم لفتح ورد الغد'}
            </button>
          )}
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
                <div className="hifz-ranges">{rangesText(verseRanges(program.direction, item.indices, program.origin))}</div>
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
