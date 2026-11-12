import { describe, it, expect } from 'vitest';
import { dayKey, DIRECTIONS } from './hifzSchedule';
import { startProgram, dailyPlan, rollDay, countStep, confirmStep, tickStep, recordStep, checkBox, tapMethod, methodTaps } from './hifzState';
import { currentStep, stepState, STEP_STATE } from './hifzSteps';
import { canRedoStep, redoStep, dayProgress, juzProgress } from './hifzStepNav';

const day = (n) => dayKey(new Date(2026, 0, n));

function memorizeVerse(state, today) {
  let s = rollDay(state, today);
  for (let i = 0; i < 3; i++) s = countStep(s, today, 'listen', 1);
  s = tickStep(s, today, 'hafiz');
  s = tickStep(s, today, 'memorize');
  s = recordStep(s, today, 'record', 'recorded');
  s = recordStep(s, today, 'record', 'reviewed');
  for (let i = 0; i < 40; i++) s = countStep(s, today, 'repeat', 1);
  return confirmStep(s, today, 'repeat');
}

// السماع والتأكيد منجزان، والحفظ هو المفتوح
function twoStepsDone() {
  let s = startProgram(DIRECTIONS.FORWARD, day(1));
  for (let i = 0; i < 3; i++) s = countStep(s, day(1), 'listen', 1);
  return tickStep(s, day(1), 'hafiz');
}

describe('حالة الخطوة', () => {
  it('منجزة ثم مفتوحة ثم مقفلة', () => {
    const s = twoStepsDone();
    expect(s.rules.steps.map((id) => stepState(id, s.progress, s.rules))).toEqual([
      STEP_STATE.DONE, STEP_STATE.DONE, STEP_STATE.OPEN, STEP_STATE.LOCKED, STEP_STATE.LOCKED,
    ]);
  });
});

describe('إعادة خطوة', () => {
  it('تمسح الخطوة وحدها فتصير المفتوحة، وما بعدها يبقى', () => {
    const s = twoStepsDone();
    const redone = redoStep(s, day(1), 'listen');
    expect(redone.progress.listen).toBe(0);
    expect(redone.progress.hafiz).toBe(true);
    expect(currentStep(redone.progress, redone.rules)).toBe('listen');
    // بعد إعادتها يعود الترتيب إلى خطوة الحفظ
    let again = redone;
    for (let i = 0; i < 3; i++) again = countStep(again, day(1), 'listen', 1);
    expect(currentStep(again.progress, again.rules)).toBe('memorize');
  });

  it('لا تُعاد خطوة لم تُنجز', () => {
    const s = twoStepsDone();
    expect(canRedoStep(s, day(1), 'memorize')).toBe(false);
    expect(redoStep(s, day(1), 'memorize')).toBe(s);
    expect(redoStep(s, day(1), 'record')).toBe(s);
    expect(redoStep(s, day(1), 'nothing')).toBe(s);
  });

  it('لا إعادة بعد إتمام ورد اليوم: ما حُفظ لا يُمسّ', () => {
    const s = memorizeVerse(startProgram(DIRECTIONS.FORWARD, day(1)), day(1));
    expect(s.memorizedOn).toHaveLength(1);
    expect(canRedoStep(s, day(1), 'listen')).toBe(false);
    expect(redoStep(s, day(1), 'listen')).toBe(s);
  });

  it('إعادة خطوة الحفظ تصفّر عدّاد طريقة الخماسيات', () => {
    let s = tapMethod(twoStepsDone(), day(1), 1);
    expect(methodTaps(s)).toBe(1);
    s = tickStep(s, day(1), 'memorize');
    s = redoStep(s, day(1), 'memorize');
    expect(methodTaps(s)).toBe(0);
    expect(currentStep(s.progress, s.rules)).toBe('memorize');
  });

  it('خطوة التكرار المؤكَّدة تعود إلى صفر بلا تأكيد', () => {
    let s = twoStepsDone();
    s = tickStep(s, day(1), 'memorize');
    s = recordStep(recordStep(s, day(1), 'record', 'recorded'), day(1), 'record', 'reviewed');
    s = redoStep(s, day(1), 'record');
    expect(s.progress.record).toEqual({ recorded: false, reviewed: false });
  });
});

describe('تقدّم اليوم', () => {
  it('اليوم الأول: خمس خطوات بلا مراجعة', () => {
    const s = twoStepsDone();
    const progress = dayProgress(s, dailyPlan(s, day(1)));
    expect(progress.steps).toEqual([true, true, false, false, false]);
    expect(progress.boxes).toEqual([]);
    expect(progress).toMatchObject({ done: 2, total: 5, percent: 40 });
  });

  it('ورد منجز يُحسب بخطواته كلّها، والمراجعة تُضاف', () => {
    let s = memorizeVerse(startProgram(DIRECTIONS.FORWARD, day(1)), day(1));
    expect(dayProgress(s, dailyPlan(s, day(1)))).toMatchObject({ done: 5, total: 5, percent: 100 });
    s = memorizeVerse(s, day(2));
    const before = dayProgress(s, dailyPlan(s, day(2)));
    expect(before.total).toBe(5 + before.boxes.length);
    expect(before.boxes.length).toBeGreaterThan(0);
    expect(before.done).toBe(5);
    s = checkBox(s, day(2), 'five', true);
    expect(dayProgress(s, dailyPlan(s, day(2))).done).toBe(6);
  });
});

describe('تقدّم الجزء', () => {
  it('البداية: الجزء الأول، 148 آية، لا محفوظ', () => {
    expect(juzProgress(startProgram(DIRECTIONS.FORWARD, day(1)))).toEqual({ juz: 1, memorized: 0, total: 148 });
  });

  it('من آخر المصحف: الجزء الثلاثون', () => {
    const s = memorizeVerse(startProgram(DIRECTIONS.BACKWARD, day(1)), day(1));
    expect(juzProgress(s)).toMatchObject({ juz: 30, memorized: 1 });
  });

  it('مجموع آيات الأجزاء 6236', () => {
    let s = startProgram(DIRECTIONS.FORWARD, day(1));
    s = { ...s, memorizedOn: Array(6236).fill(day(1)) };
    expect(juzProgress(s).juz).toBe(30);
    expect(juzProgress(s).memorized).toBe(juzProgress(s).total);
  });
});
