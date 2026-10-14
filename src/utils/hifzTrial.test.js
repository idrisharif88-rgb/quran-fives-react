import { describe, it, expect } from 'vitest';
import { skipStep, nextTrialDay } from './hifzTrial';
import { startProgram, dailyPlan, effectiveDay } from './hifzState';
import { currentStep } from './hifzSteps';
import { dayKey } from './hifzSchedule';

const day1 = dayKey(new Date(2026, 0, 1));

describe('trial mode tools', () => {
  it('skip completes the open step, and five skips memorise the portion', () => {
    let s = startProgram('forward', day1, { versesPerDay: 3 });
    const seen = [];
    for (let i = 0; i < 5; i++) {
      seen.push(currentStep(s.progress, s.rules));
      s = skipStep(s, day1);
    }
    expect(seen).toEqual(['listen', 'hafiz', 'memorize', 'record', 'repeat']);
    expect(s.memorizedOn).toEqual([day1, day1, day1]);
    expect(skipStep(s, day1)).toBe(s);   // ورد اليوم منجز: لا شيء يُتخطّى
  });

  it('next day moves the programme a day on, with the same rules', () => {
    let s = startProgram('forward', day1, { versesPerDay: 3 });
    for (let i = 0; i < 5; i++) s = skipStep(s, day1);
    s = nextTrialDay(s);
    const today = effectiveDay(s, day1);
    const plan = dailyPlan(s, today);
    expect(plan.verse).toMatchObject({ indices: [3, 4, 5], done: false });
    expect(plan.boxItems.map((item) => item.box)).toEqual(['five']);
  });
});
