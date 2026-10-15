import { STEP_DEFS, currentStep, stepTarget } from './hifzSteps';
import { countStep, confirmStep, tickStep, recordStep, dailyPlan, rollDay, effectiveDay, verseDoneToday } from './hifzState';

// ─── وضع التجربة (للمشرف) ─── أدوات تُسرّع البرنامج التجريبي وحده؛ القواعد هي نفسها.

// يُتمّ الخطوة المفتوحة دفعة واحدة، بالأحداث نفسها التي يطلقها الحافظ
export function skipStep(state, today) {
  const id = currentStep(state.progress, state.rules);
  const def = id && STEP_DEFS[id];
  if (!def) return state;
  if (def.kind === 'count') {
    const counted = countStep(state, today, id, stepTarget(id, state.rules));
    return def.confirm ? confirmStep(counted, today, id) : counted;
  }
  if (def.kind === 'record') return recordStep(recordStep(state, today, id, 'recorded'), today, id, 'reviewed');
  return tickStep(state, today, id);
}

// ينقل البرنامج إلى يومه التالي فوراً (بلا انتظار التقويم ولا شرط إتمام اليوم)
export const nextTrialDay = (state) => ({ ...state, shift: (state.shift || 0) + 1 });

// يُتمّ يوم البرنامج كلّه: خطوات الورد ثم كل صندوق فيه آيات. الصناديق تُشكّ معاً وسجلّ
// اليوم يُكتب مرة (لا checkBox لكل صندوق): القفز مئتي يوم يمرّ بهذا مئتي مرة.
export function completeTrialDay(state, today) {
  let s = rollDay(state, today);
  for (let guard = 0; guard < 20 && !verseDoneToday(s, today) && currentStep(s.progress, s.rules); guard++) {
    const next = skipStep(s, today);
    if (next === s) break;
    s = next;
  }
  const { boxItems, verse } = dailyPlan(s, today);
  const checks = { ...s.checks };
  for (const item of boxItems) checks[item.box] = true;
  return { ...s, checks, dayLog: { ...s.dayLog, [today]: { verse: verse ? verse.done : true, boxes: true } } };
}

export const MAX_JUMP = 1000;

// قفز أيام: كل يوم يُتمّ كما لو أنجزه الحافظ ثم يُنتقل إلى ما بعده، فتمتلئ الصناديق
// كما تمتلئ في البرنامج الحقيقي. calendarDay يوم التقويم (يوم البرنامج يُحسب من shift).
export function jumpTrialDays(state, calendarDay, days) {
  let s = state;
  for (let i = 0; i < days; i++) {
    s = nextTrialDay(completeTrialDay(s, effectiveDay(s, calendarDay)));
  }
  return rollDay(s, effectiveDay(s, calendarDay));
}
