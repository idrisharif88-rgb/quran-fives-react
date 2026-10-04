import { describe, it, expect } from 'vitest';
import {
  dayKey, daysBetween, verseAt, stageOfAge, STAGES, boxesFor, reviewTotal, reviewGroupOf,
  verseRanges, TOTAL_VERSES, DIRECTIONS, DEFAULT_RULES,
} from './hifzSchedule';
import {
  startProgram, loadProgram, dailyPlan, rollDay, countStep, confirmStep, tickStep, recordStep, checkBox,
  verseDoneToday, shouldCelebrate, markCelebrated,
} from './hifzState';
import { currentStep } from './hifzSteps';

// اليوم رقم n من البرنامج (اليوم 1 = 2026-01-01)
const day = (n) => dayKey(new Date(2026, 0, n));

// يُنجز الخطوات الخمس للآية الجارية في يوم واحد
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

// آية كل يوم بلا انقطاع حتى اليوم n
function runDays(n, direction = DIRECTIONS.FORWARD) {
  let s = startProgram(direction, day(1));
  for (let d = 1; d <= n; d++) s = memorizeVerse(s, day(d));
  return s;
}

describe('hifz schedule', () => {
  it('covers the whole mushaf in both directions', () => {
    expect(TOTAL_VERSES).toBe(6236);
    expect(verseAt('forward', 0)).toEqual({ s: 1, a: 1 });
    expect(verseAt('forward', 7)).toEqual({ s: 2, a: 1 });
    expect(verseAt('forward', 6235)).toEqual({ s: 114, a: 6 });
    expect(verseAt('forward', 6236)).toBeNull();
    // من آخر المصحف: السور تنازلياً وآيات كل سورة بترتيبها
    expect(verseAt('backward', 0)).toEqual({ s: 114, a: 1 });
    expect(verseAt('backward', 5)).toEqual({ s: 114, a: 6 });
    expect(verseAt('backward', 6)).toEqual({ s: 113, a: 1 });
    expect(verseAt('backward', 6235)).toEqual({ s: 1, a: 7 });
  });

  it('moves a verse through its life cycle by its own clock', () => {
    expect(stageOfAge(0)).toBe(STAGES.TODAY);
    expect(stageOfAge(1)).toBe(STAGES.FIVE);
    expect(stageOfAge(2)).toBe(STAGES.DAILY);
    expect(stageOfAge(26)).toBe(STAGES.DAILY);   // اليوم الخامس والعشرون من «مرة يومياً»
    expect(stageOfAge(27)).toBe(STAGES.REVIEW);
  });

  it('day 100: 1 new, 1 in the five box, 25 in the 25 box, 73 in permanent review', () => {
    const s = runDays(100);
    const boxes = boxesFor(s.memorizedOn, s.startedOn, day(100));
    expect(boxes.today).toEqual([99]);                               // الآية 100
    expect(boxes.five).toEqual([98]);                                // الآية 99
    expect(boxes.daily).toEqual(Array.from({ length: 25 }, (_, i) => 73 + i)); // 74–98
    expect(reviewTotal(s.memorizedOn, day(100))).toBe(73);           // 1–73
    expect(boxes.review.length).toBeGreaterThan(0);
    expect(boxes.review.length).toBeLessThan(73);                    // مجموعة اليوم فقط
  });

  it('reads every permanent-review verse exactly once in any six consecutive days', () => {
    const s = runDays(100);
    const seen = new Map();
    // الآيات 1–73 في الصندوق الدائم طوال الأيام 100–105
    for (let d = 100; d < 100 + DEFAULT_RULES.reviewCycleDays; d++) {
      boxesFor(s.memorizedOn, s.startedOn, day(d)).review
        .filter((i) => i < 73)
        .forEach((i) => seen.set(i, (seen.get(i) || 0) + 1));
    }
    expect(seen.size).toBe(73);
    expect([...seen.values()].every((count) => count === 1)).toBe(true);
  });

  it('keeps neighbouring verses in the same review group and balances the six days', () => {
    expect([0, 1, 2, 3, 4].map((i) => reviewGroupOf(i))).toEqual([0, 0, 0, 0, 0]);
    expect([5, 10, 15, 20, 25, 30].map((i) => reviewGroupOf(i))).toEqual([1, 2, 3, 4, 5, 0]);
    const loads = Array(6).fill(0);
    for (let i = 0; i < 600; i++) loads[reviewGroupOf(i)]++;
    expect(loads).toEqual([100, 100, 100, 100, 100, 100]);
  });

  it('describes a box as verse ranges per surah', () => {
    expect(verseRanges('forward', [5, 6, 7, 8])).toEqual([{ s: 1, from: 6, to: 7 }, { s: 2, from: 1, to: 2 }]);
    expect(verseRanges('backward', [4, 5, 6])).toEqual([{ s: 114, from: 5, to: 6 }, { s: 113, from: 1, to: 1 }]);
  });

  it('flips the day at local midnight', () => {
    expect(dayKey(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
    expect(dayKey(new Date(2026, 0, 2, 0, 0))).toBe('2026-01-02');
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });
});

describe('hifz state', () => {
  const step = (s) => currentStep(s.progress, s.rules);

  it('locks the five steps in order', () => {
    let s = startProgram('forward', day(1));
    expect(step(s)).toBe('listen');
    expect(tickStep(s, day(1), 'hafiz')).toBe(s);        // الخطوة 2 مقفلة قبل السماع
    expect(countStep(s, day(1), 'repeat', 1)).toBe(s);   // والعدّاد كذلك
    s = countStep(countStep(s, day(1), 'listen', 1), day(1), 'listen', 1);
    expect(step(s)).toBe('listen');                      // مرتان لا تكفيان
    s = countStep(s, day(1), 'listen', 1);
    expect(step(s)).toBe('hafiz');
    s = tickStep(s, day(1), 'memorize');
    expect(step(s)).toBe('hafiz');                       // لا قفز فوق تأكيد الحافظ
    s = tickStep(tickStep(s, day(1), 'hafiz'), day(1), 'memorize');
    expect(step(s)).toBe('record');
    expect(recordStep(s, day(1), 'record', 'reviewed')).toEqual(s); // لا سماع قبل التسجيل
    s = recordStep(recordStep(s, day(1), 'record', 'recorded'), day(1), 'record', 'reviewed');
    expect(step(s)).toBe('repeat');
  });

  it('a recording with a mistake sends the step back to recording', () => {
    let s = startProgram('forward', day(1));
    for (let i = 0; i < 3; i++) s = countStep(s, day(1), 'listen', 1);
    s = tickStep(tickStep(s, day(1), 'hafiz'), day(1), 'memorize');
    s = recordStep(s, day(1), 'record', 'recorded');
    s = recordStep(s, day(1), 'record', 'retry');
    expect(s.progress.record).toEqual({ recorded: false, reviewed: false });
    expect(step(s)).toBe('record');                      // لا تُفتح الخطوة الخامسة
    expect(recordStep(s, day(1), 'record', 'reviewed')).toEqual(s); // لا حكم بلا تسجيل جديد
    s = recordStep(recordStep(s, day(1), 'record', 'recorded'), day(1), 'record', 'reviewed');
    expect(step(s)).toBe('repeat');
  });

  it('the repeat counter goes up, down and resets, and 40 completes the verse', () => {
    let s = startProgram('forward', day(1));
    for (let i = 0; i < 3; i++) s = countStep(s, day(1), 'listen', 1);
    s = tickStep(tickStep(s, day(1), 'hafiz'), day(1), 'memorize');
    s = recordStep(recordStep(s, day(1), 'record', 'recorded'), day(1), 'record', 'reviewed');
    for (let i = 0; i < 23; i++) s = countStep(s, day(1), 'repeat', 1);
    s = countStep(countStep(s, day(1), 'repeat', -1), day(1), 'repeat', -1);
    expect(s.progress.repeat.count).toBe(21);
    expect(confirmStep(s, day(1), 'repeat')).toEqual(s);  // لا تأكيد قبل بلوغ الأربعين
    s = countStep(s, day(1), 'repeat', 'reset');
    expect(s.progress.repeat.count).toBe(0);
    expect(countStep(s, day(1), 'repeat', -1).progress.repeat.count).toBe(0);
    for (let i = 0; i < 45; i++) s = countStep(s, day(1), 'repeat', 1);
    expect(s.progress.repeat.count).toBe(40);             // لا يتجاوز الهدف
    // بلوغ الأربعين لا يُتمّ الآية وحده: ينتظر زرّ التأكيد، والنقص ما زال ممكناً
    expect(s.memorizedOn).toEqual([]);
    expect(step(s)).toBe('repeat');
    s = countStep(countStep(s, day(1), 'repeat', -1), day(1), 'repeat', 1);
    s = confirmStep(s, day(1), 'repeat');
    expect(s.memorizedOn).toEqual([day(1)]);
    expect(verseDoneToday(s, day(1))).toBe(true);
  });

  it('allows one new verse per day and opens the next one tomorrow', () => {
    let s = memorizeVerse(startProgram('forward', day(1)), day(1));
    expect(dailyPlan(s, day(1)).verse).toMatchObject({ index: 0, done: true });
    expect(countStep(s, day(1), 'listen', 1)).toBe(s);  // لا آية ثانية في اليوم نفسه
    expect(dailyPlan(s, day(2)).verse).toMatchObject({ index: 1, ref: { s: 1, a: 2 }, done: false });
    s = countStep(rollDay(s, day(2)), day(2), 'listen', 1);
    expect(s.progress.listen).toBe(1);
  });

  it('an unfinished verse continues the next day with its progress kept', () => {
    let s = startProgram('forward', day(1));
    for (let i = 0; i < 3; i++) s = countStep(s, day(1), 'listen', 1);
    s = tickStep(s, day(1), 'hafiz');
    s = rollDay(s, day(2));
    const plan = dailyPlan(s, day(2));
    expect(plan.verse).toMatchObject({ index: 0, done: false });
    expect(plan.openStep).toBe('memorize');
    s = memorizeVerse(s, day(2));
    expect(s.memorizedOn).toEqual([day(2)]);             // ساعتها تبدأ يوم إتمامها
  });

  it('shows only the boxes that hold verses, and completes the day when all are ticked', () => {
    let s = memorizeVerse(startProgram('forward', day(1)), day(1));
    expect(dailyPlan(s, day(1))).toMatchObject({ boxItems: [], complete: true });

    s = memorizeVerse(s, day(2));
    let plan = dailyPlan(s, day(2));
    expect(plan.boxItems.map((b) => b.box)).toEqual(['five']);
    expect(plan.complete).toBe(false);
    expect(checkBox(s, day(2), 'daily')).toEqual(s);      // صندوق فارغ لا يُشكّ
    s = checkBox(s, day(2), 'five');
    expect(dailyPlan(s, day(2)).complete).toBe(true);
    expect(s.dayLog[day(2)]).toEqual({ verse: true, boxes: true });
  });

  it('day 100 timeline: the five steps plus three boxes, eight checks in all', () => {
    let s = runDays(99);
    s = rollDay(s, day(100));
    let plan = dailyPlan(s, day(100));
    expect(plan.verse).toMatchObject({ index: 99, done: false });
    expect(plan.boxItems.map((b) => b.box)).toEqual(['five', 'daily', 'review']);
    // الصناديق مفتوحة قبل الآية الجديدة
    s = checkBox(checkBox(checkBox(s, day(100), 'five'), day(100), 'daily'), day(100), 'review');
    expect(dailyPlan(s, day(100)).complete).toBe(false);
    s = memorizeVerse(s, day(100));
    expect(dailyPlan(s, day(100)).complete).toBe(true);
  });

  it('box ticks reset at midnight, and the clock going backwards changes nothing', () => {
    let s = runDays(3);
    s = checkBox(s, day(3), 'five');
    expect(s.checks).toMatchObject({ day: day(3), five: true });
    expect(rollDay(s, day(2))).toBe(s);
    expect(rollDay(s, day(4)).checks).toEqual({ day: day(4), five: false, daily: false, review: false });
  });

  it('verses keep ageing on days with no memorisation', () => {
    const s = runDays(10);                                // ثم انقطاع
    const boxes = boxesFor(s.memorizedOn, s.startedOn, day(40));
    expect(boxes.five).toEqual([]);
    expect(boxes.daily).toEqual([]);                      // كلها تخرّجت بساعتها
    expect(reviewTotal(s.memorizedOn, day(40))).toBe(10);
  });

  it('memorises from the end of the mushaf when started backward', () => {
    const s = runDays(7, DIRECTIONS.BACKWARD);
    expect(verseAt(s.direction, 0)).toEqual({ s: 114, a: 1 });
    expect(dailyPlan(s, day(8)).verse.ref).toEqual({ s: 113, a: 2 });
  });

  it('celebrates a completed day once', () => {
    let s = memorizeVerse(startProgram('forward', day(1)), day(1));
    expect(shouldCelebrate(s, day(1))).toBe(true);
    s = markCelebrated(s, day(1));
    expect(shouldCelebrate(s, day(1))).toBe(false);
    expect(shouldCelebrate(s, day(2))).toBe(false);       // يوم جديد لم يكتمل بعد
  });

  it('follows changed rules: fewer repeats, a longer daily box, a step removed', () => {
    const rules = { repeatTarget: 10, dailyOnceDays: 30, steps: ['listen', 'memorize', 'repeat'] };
    let s = startProgram('forward', day(1), rules);
    for (let i = 0; i < 3; i++) s = countStep(s, day(1), 'listen', 1);
    expect(step(s)).toBe('memorize');                     // لا خطوة حافظ ولا تسجيل
    s = tickStep(s, day(1), 'memorize');
    for (let i = 0; i < 10; i++) s = countStep(s, day(1), 'repeat', 1);
    s = confirmStep(s, day(1), 'repeat');
    expect(s.memorizedOn).toEqual([day(1)]);
    expect(stageOfAge(31, s.rules)).toBe(STAGES.DAILY);
    expect(stageOfAge(32, s.rules)).toBe(STAGES.REVIEW);
  });

  it('upgrades stored data when a rule or step is added later', () => {
    const old = JSON.parse(JSON.stringify(runDays(2)));
    delete old.rules.reviewRun;
    delete old.progress.repeat;
    const loaded = loadProgram(old);
    expect(loaded.rules.reviewRun).toBe(5);
    expect(loaded.progress.repeat).toEqual({ count: 0, confirmed: false });
    // عدّاد خُزّن رقماً قبل إضافة التأكيد
    old.progress.repeat = 37;
    expect(loadProgram(old).progress.repeat).toEqual({ count: 37, confirmed: false });
  });

  it('rejects stored data it does not recognise', () => {
    expect(loadProgram(null)).toBeNull();
    expect(loadProgram({ version: 99 })).toBeNull();
    const s = runDays(2);
    expect(loadProgram(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});
