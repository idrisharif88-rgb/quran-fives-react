import { STEP_DEFS, currentStep, stepTarget } from './hifzSteps';
import { countStep, confirmStep, tickStep, recordStep } from './hifzState';

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
