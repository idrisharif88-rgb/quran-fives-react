import { describe, it, expect } from 'vitest';
import {
  dayKey, daysBetween, verseAt, stageOfAge, STAGES, boxesFor, reviewTotal, reviewGroupOf,
  verseRanges, TOTAL_VERSES, DIRECTIONS, DEFAULT_RULES, withDefaultRules, indexOfVerse,
} from './hifzSchedule';
import {
  startProgram, loadProgram, dailyPlan, rollDay, countStep, confirmStep, tickStep, recordStep, checkBox,
  linkRefOf, verseDoneToday, shouldCelebrate, markCelebrated, portionOf, openExtraPortion, changeVersesPerDay,
  cancelSession, sessionStarted, effectiveDay, tapMethod, answerMethod, methodTaps, methodChecked, changeListenTarget, changeRepeatTarget,
} from './hifzState';
import { methodStages, methodTotal, methodPosition } from './hifzMethod';
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

describe('hifz daily portion (3, 5, 7 verses a day)', () => {
  const start = (versesPerDay, direction = 'forward') => startProgram(direction, day(1), { versesPerDay });

  it('one verse a day stays the default, for new and for stored programs', () => {
    expect(startProgram('forward', day(1)).rules.versesPerDay).toBe(1);
    expect(withDefaultRules({ repeatTarget: 10 }).versesPerDay).toBe(1);   // برنامج خُزّن قبل الإضافة
    expect(withDefaultRules({ versesPerDay: 'x' }).versesPerDay).toBe(1);
    const old = loadProgram({ ...startProgram('forward', day(1)), rules: { listenTarget: 3 } });
    expect(dailyPlan(old, day(1)).verse.indices).toEqual([0]);
  });

  it.each([3, 5, 7])('%i verses: the day’s portion is that many consecutive verses', (n) => {
    const s = start(n);
    const plan = dailyPlan(s, day(1));
    expect(plan.verse.indices).toEqual(Array.from({ length: n }, (_, i) => i));
    expect(plan.verse.refs[0]).toEqual({ s: 1, a: 1 });
    expect(plan.verse.ref).toEqual(plan.verse.refs[0]);
    expect(plan.verse.refs).toHaveLength(n);
  });

  it('the portion is memorised as one unit: the same five steps, then all its verses count', () => {
    let s = memorizeVerse(start(5), day(1));
    expect(s.memorizedOn).toEqual(Array(5).fill(day(1)));
    expect(dailyPlan(s, day(1)).verse).toMatchObject({ index: 0, indices: [0, 1, 2, 3, 4], done: true });
    expect(countStep(s, day(1), 'listen', 1)).toBe(s);   // لا ورد ثانٍ في اليوم نفسه
    // الغد: الورد التالي يبدأ من حيث انتهى الأوّل
    expect(dailyPlan(s, day(2)).verse).toMatchObject({ index: 5, indices: [5, 6, 7, 8, 9], done: false });
    s = memorizeVerse(s, day(2));
    expect(s.memorizedOn).toHaveLength(10);
  });

  it('a portion crosses a surah boundary in order', () => {
    // الفاتحة سبع آيات: ورد اليوم الثالث من ثلاث = الفاتحة 7 ثم البقرة 1 و2
    let s = start(3);
    s = memorizeVerse(s, day(1));
    s = memorizeVerse(s, day(2));
    expect(dailyPlan(s, day(3)).verse.refs).toEqual([{ s: 1, a: 7 }, { s: 2, a: 1 }, { s: 2, a: 2 }]);
  });

  it('every verse of yesterday’s portion enters the review boxes', () => {
    let s = memorizeVerse(start(7), day(1));
    const five = dailyPlan(s, day(2)).boxItems.find((item) => item.box === 'five');
    expect(five.indices).toEqual([0, 1, 2, 3, 4, 5, 6]);
    s = memorizeVerse(s, day(2));
    const plan = dailyPlan(s, day(3));
    expect(plan.boxItems.find((item) => item.box === 'five').indices).toHaveLength(7);
    expect(plan.boxItems.find((item) => item.box === 'daily').indices).toHaveLength(7);
  });

  it('an unfinished portion continues the next day, whole', () => {
    let s = countStep(start(3), day(1), 'listen', 1);
    expect(dailyPlan(s, day(2)).verse).toMatchObject({ indices: [0, 1, 2], done: false });
    s = memorizeVerse(s, day(2));
    expect(s.memorizedOn).toEqual(Array(3).fill(day(2)));
  });

  it('the last portion of the mushaf is cut to what remains', () => {
    const s = { ...start(7), memorizedOn: Array(TOTAL_VERSES - 2).fill(day(1)) };
    expect(portionOf(s, day(5))).toEqual({ start: TOTAL_VERSES - 2, count: 2, done: false });
    const done = memorizeVerse(s, day(5));
    expect(done.memorizedOn).toHaveLength(TOTAL_VERSES);
    expect(dailyPlan(done, day(6)).verse).toBeNull();
  });

  it('works from the end of the mushaf too', () => {
    // الناس ست آيات: ورد من خمس، ثم الناس 6 وأربع من الفلق
    let s = start(5, 'backward');
    expect(dailyPlan(s, day(1)).verse.refs.map((r) => `${r.s}:${r.a}`)).toEqual(['114:1', '114:2', '114:3', '114:4', '114:5']);
    s = memorizeVerse(s, day(1));
    expect(dailyPlan(s, day(2)).verse.refs.map((r) => `${r.s}:${r.a}`)).toEqual(['114:6', '113:1', '113:2', '113:3', '113:4']);
  });
});

describe('hifz extra portion on the same day: reviews follow what was memorised, not the calendar', () => {
  // يوم البرنامج في يوم التقويم الأوّل
  const now = (s) => effectiveDay(s, day(1));

  it('opens only after the day is complete: its portion and every box', () => {
    const fresh = startProgram('forward', day(1), { versesPerDay: 3 });
    expect(openExtraPortion(fresh, now(fresh))).toBe(fresh);

    let s = memorizeVerse(fresh, now(fresh));
    s = openExtraPortion(s, now(s));                       // اليوم الأوّل بلا صناديق: يُفتح
    s = memorizeVerse(s, now(s));
    expect(openExtraPortion(s, now(s))).toBe(s);           // «آيات الأمس» لم تُقرأ بعد
    s = checkBox(s, now(s), 'five');
    expect(openExtraPortion(s, now(s)).shift).toBe(2);
  });

  it('the portion just memorised becomes yesterday\'s verses, on the same calendar day', () => {
    let s = memorizeVerse(startProgram('forward', day(1), { versesPerDay: 3 }), day(1));
    expect(countStep(s, now(s), 'listen', 1)).toBe(s);     // مقفل بلا فتح
    s = openExtraPortion(s, now(s));
    expect(now(s)).toBe(day(2));
    const plan = dailyPlan(s, now(s));
    expect(plan.verse).toMatchObject({ indices: [3, 4, 5], done: false });
    expect(plan.boxItems.map((item) => [item.box, item.indices])).toEqual([['five', [0, 1, 2]]]);
    expect(plan.complete).toBe(false);
  });

  it('three portions in one day bring three days of repetition, linking and review', () => {
    let s = startProgram('forward', day(1), { versesPerDay: 3 });
    for (let n = 0; n < 3; n++) {
      if (n > 0) s = openExtraPortion(s, now(s));
      s = memorizeVerse(s, now(s));
      for (const item of dailyPlan(s, now(s)).boxItems) s = checkBox(s, now(s), item.box);
      expect(dailyPlan(s, now(s)).complete).toBe(true);
    }
    expect(s.memorizedOn).toEqual([day(1), day(1), day(1), day(2), day(2), day(2), day(3), day(3), day(3)]);
    // في اليوم الثالث من البرنامج: ورد الثاني «آيات الأمس»، وورد الأوّل في صندوق الربط
    const boxes = Object.fromEntries(dailyPlan(s, now(s)).boxItems.map((item) => [item.box, item.indices]));
    expect(boxes).toEqual({ five: [3, 4, 5], daily: [0, 1, 2] });
  });

  it('the next calendar day carries on from where the programme reached', () => {
    let s = memorizeVerse(startProgram('forward', day(1), { versesPerDay: 3 }), day(1));
    s = openExtraPortion(s, now(s));
    s = memorizeVerse(s, now(s));
    const tomorrow = effectiveDay(s, day(2));
    expect(tomorrow).toBe(day(3));
    const plan = dailyPlan(s, tomorrow);
    expect(plan.verse).toMatchObject({ indices: [6, 7, 8], done: false });
    expect(plan.boxItems.find((item) => item.box === 'five').indices).toEqual([3, 4, 5]);
    expect(plan.boxItems.find((item) => item.box === 'daily').indices).toEqual([0, 1, 2]);
  });

  it('a programme stored before this has no shift and follows the calendar', () => {
    const old = { ...memorizeVerse(startProgram('forward', day(1)), day(1)) };
    delete old.shift;
    const loaded = loadProgram(old);
    expect(loaded.shift).toBe(0);
    expect(effectiveDay(loaded, day(2))).toBe(day(2));
  });
});

describe('hifz starting from a chosen verse (supervisor permission)', () => {
  it('finds a verse’s place in the memorising order', () => {
    expect(indexOfVerse('forward', 1, 1)).toBe(0);
    expect(indexOfVerse('forward', 2, 1)).toBe(7);
    expect(indexOfVerse('forward', 114, 6)).toBe(TOTAL_VERSES - 1);
    expect(indexOfVerse('forward', 2, 287)).toBeNull();     // لا آية بهذا الرقم
    expect(indexOfVerse('forward', 115, 1)).toBeNull();
    for (const [s, a] of [[1, 5], [2, 255], [36, 1], [112, 4]]) {
      expect(verseAt('forward', indexOfVerse('forward', s, a))).toEqual({ s, a });
    }
  });

  it('the first portion is the chosen verse and what follows it', () => {
    const origin = indexOfVerse('forward', 36, 1);          // يس
    const s = startProgram('forward', day(1), { versesPerDay: 3 }, origin);
    expect(dailyPlan(s, day(1)).verse.refs).toEqual([{ s: 36, a: 1 }, { s: 36, a: 2 }, { s: 36, a: 3 }]);
    const next = memorizeVerse(s, day(1));
    expect(dailyPlan(next, day(2)).verse.ref).toEqual({ s: 36, a: 4 });
    // الصناديق تعرض آياتها الحقيقية
    expect(verseRanges('forward', dailyPlan(next, day(2)).boxItems[0].indices, next.origin)).toEqual([{ s: 36, from: 1, to: 3 }]);
  });

  it('after the end of the mushaf it wraps to the beginning, so the whole mushaf is covered', () => {
    const origin = indexOfVerse('forward', 114, 5);
    const s = startProgram('forward', day(1), { versesPerDay: 5 }, origin);
    expect(dailyPlan(s, day(1)).verse.refs).toEqual([{ s: 114, a: 5 }, { s: 114, a: 6 }, { s: 1, a: 1 }, { s: 1, a: 2 }, { s: 1, a: 3 }]);
    expect(verseAt('forward', TOTAL_VERSES - 1, origin)).toEqual({ s: 114, a: 4 });   // آخر ما يُحفظ
    expect(verseAt('forward', TOTAL_VERSES, origin)).toBeNull();
  });

  it('programmes without a chosen start, and stored ones, begin at the edge of the mushaf', () => {
    expect(startProgram('forward', day(1)).origin).toBe(0);
    expect(startProgram('forward', day(1), DEFAULT_RULES, -4).origin).toBe(0);
    expect(startProgram('forward', day(1), DEFAULT_RULES, TOTAL_VERSES).origin).toBe(0);
    const stored = { ...startProgram('forward', day(1)) };
    delete stored.origin;
    expect(dailyPlan(loadProgram(stored), day(1)).verse.ref).toEqual({ s: 1, a: 1 });
  });
});

describe('hifz: changing the daily portion without resetting', () => {
  it('keeps everything memorised and applies from the next portion', () => {
    let s = memorizeVerse(startProgram('forward', day(1), { versesPerDay: 3 }), day(1));
    s = memorizeVerse(s, day(2));
    const changed = changeVersesPerDay(s, day(2), 7);
    expect(changed.memorizedOn).toEqual(s.memorizedOn);                 // ما حُفظ كما هو
    expect(changed.startedOn).toBe(s.startedOn);
    expect(dailyPlan(changed, day(2)).verse).toMatchObject({ indices: [3, 4, 5], done: true });   // ورد اليوم المنجز لا يتغيّر
    expect(dailyPlan(changed, day(3)).verse.indices).toEqual([6, 7, 8, 9, 10, 11, 12]);
    // صناديق الغد كما كانت
    expect(dailyPlan(changed, day(3)).boxItems.map((i) => [i.box, i.indices.length])).toEqual(dailyPlan(s, day(3)).boxItems.map((i) => [i.box, i.indices.length]));
  });

  it('a portion in progress changes its verses, so only its step progress restarts', () => {
    let s = memorizeVerse(startProgram('forward', day(1), { versesPerDay: 5 }), day(1));
    s = countStep(rollDay(s, day(2)), day(2), 'listen', 1);
    expect(s.progress.listen).toBe(1);
    const changed = changeVersesPerDay(s, day(2), 3);
    expect(changed.progress.listen).toBe(0);
    expect(changed.memorizedOn).toHaveLength(5);
    expect(dailyPlan(changed, day(2)).verse).toMatchObject({ indices: [5, 6, 7], done: false });
  });

  it('ignores the same value and values that are not offered', () => {
    const s = startProgram('forward', day(1), { versesPerDay: 3 });
    expect(changeVersesPerDay(s, day(1), 3)).toBe(s);
    expect(changeVersesPerDay(s, day(1), 4)).toBe(s);
    expect(changeVersesPerDay(s, day(1), '5')).toBe(s);
  });
});

describe('cancelling today\'s session', () => {
  it('restarts the steps of the portion in progress and keeps everything else', () => {
    let s = memorizeVerse(startProgram('forward', day(1), { versesPerDay: 3 }), day(1));
    s = checkBox(s, day(2), 'five');
    s = countStep(s, day(2), 'listen', 1);
    s = countStep(s, day(2), 'listen', 1);
    expect(sessionStarted(s, day(2))).toBe(true);

    const cancelled = cancelSession(s, day(2));
    expect(cancelled.progress.listen).toBe(0);
    expect(currentStep(cancelled.progress, cancelled.rules)).toBe('listen');
    expect(sessionStarted(cancelled, day(2))).toBe(false);
    expect(cancelled.memorizedOn).toEqual(s.memorizedOn);
    expect(cancelled.checks).toEqual(s.checks);
    expect(dailyPlan(cancelled, day(2)).verse.indices).toEqual([3, 4, 5]);
  });

  it('does nothing before the first step or after the portion is done', () => {
    const fresh = startProgram('forward', day(1));
    expect(sessionStarted(fresh, day(1))).toBe(false);
    expect(cancelSession(fresh, day(1))).toBe(fresh);

    const done = memorizeVerse(fresh, day(1));
    expect(sessionStarted(done, day(1))).toBe(false);
    expect(cancelSession(done, day(1))).toBe(done);
    expect(done.memorizedOn).toHaveLength(1);
  });
});

describe('طريقة الخماسيات', () => {
  it('each verse alone, then joined with those before it', () => {
    expect(methodStages(1)).toEqual([{ from: 0, to: 0 }]);
    expect(methodStages(3)).toEqual([
      { from: 0, to: 0 }, { from: 1, to: 1 }, { from: 0, to: 1 }, { from: 2, to: 2 }, { from: 0, to: 2 },
    ]);
    expect(methodStages(7)).toHaveLength(13);
    expect(methodTotal(3)).toBe(25);
  });

  it('a chosen start verse goes toward An-Nas or toward Al-Fatiha', () => {
    const fwd = indexOfVerse('forward', 112, 4);
    const back = indexOfVerse('backward', 112, 4);
    expect(verseAt('forward', 1, fwd)).toEqual({ s: 113, a: 1 });
    expect(verseAt('backward', 1, back)).toEqual({ s: 111, a: 1 });
  });

  it('adds «الربط» as the last stage when there is a verse from yesterday', () => {
    expect(methodStages(3, true)).toHaveLength(6);
    expect(methodStages(3, true)[5]).toEqual({ link: true, from: 0, to: 0 });
    expect(methodStages(0, true)).toEqual([]);
    expect(methodPosition(3, 25, 5, true)).toMatchObject({ done: false, stageIndex: 5, stage: { link: true } });
    expect(methodPosition(3, 30, 6, true)).toMatchObject({ done: true });
  });

  it('links yesterday\'s last verse to today\'s first, never across a surah or on day one', () => {
    const s = startProgram('forward', day(1));
    expect(linkRefOf(s, 0)).toBeNull();
    expect(linkRefOf(s, 1)).toEqual({ s: 1, a: 1 });
    expect(linkRefOf(s, 7)).toBeNull();   // 2:1 بداية سورة
    expect(dailyPlan(runDays(1), day(2)).verse.linkRef).toEqual({ s: 1, a: 1 });
    expect(dailyPlan(startProgram('forward', day(1)), day(1)).verse.linkRef).toBeNull();
  });

  it('moves to the next stage after five repetitions', () => {
    expect(methodPosition(3, 0)).toMatchObject({ stageIndex: 0, rep: 0, done: false, stageCount: 5 });
    expect(methodPosition(3, 4)).toMatchObject({ stageIndex: 0, rep: 4 });
    expect(methodPosition(3, 5)).toMatchObject({ stageIndex: 1, rep: 0, stage: { from: 1, to: 1 } });
    expect(methodPosition(3, 10)).toMatchObject({ stageIndex: 2, stage: { from: 0, to: 1 } });
    expect(methodPosition(3, 25)).toMatchObject({ done: true, stageIndex: 4, rep: 5 });
  });

  // يصل إلى خطوة الحفظ: سماع المقرئ ثم تأكيد الحافظ
  const atMemorize = (perDay) => {
    let s = startProgram('forward', day(1), { versesPerDay: perDay });
    for (let i = 0; i < 3; i++) s = countStep(s, day(1), 'listen', 1);
    return tickStep(s, day(1), 'hafiz');
  };

  it('counts only in the memorise step, within its total, and does not finish the step by itself', () => {
    const early = startProgram('forward', day(1), { versesPerDay: 3 });
    expect(tapMethod(early, day(1), 1)).toBe(early);

    let s = atMemorize(3);
    for (let stage = 0; stage < 5; stage++) {
      for (let i = 0; i < 8; i++) s = tapMethod(s, day(1), 1);   // لا يتجاوز خمس المرحلة قبل الجواب
      s = answerMethod(s, day(1), true);
    }
    expect(methodTaps(s)).toBe(25);
    expect(methodChecked(s)).toBe(5);
    expect(currentStep(s.progress, s.rules)).toBe('memorize');
    expect(methodTaps(tapMethod(s, day(1), -1))).toBe(25);           // مرحلة أُجيب عنها لا تُنقص
    expect(methodTaps(tapMethod(s, day(1), 'reset'))).toBe(0);
  });

  it('asks after five: «no» repeats the stage and counts the newest verse as hard, «yes» moves on', () => {
    let s = atMemorize(3);
    for (let i = 0; i < 4; i++) s = tapMethod(s, day(1), 1);
    expect(answerMethod(s, day(1), true)).toBe(s);                    // لا سؤال قبل الخامسة
    s = tapMethod(s, day(1), 1);
    s = answerMethod(s, day(1), false);
    expect(methodTaps(s)).toBe(0);
    expect(s.hardVerses).toEqual({ 0: 1 });
    for (let i = 0; i < 5; i++) s = tapMethod(s, day(1), 1);
    s = answerMethod(s, day(1), true);
    expect(methodChecked(s)).toBe(1);
    for (let i = 0; i < 5; i++) s = tapMethod(s, day(1), 1);          // الآية الثانية وحدها
    s = answerMethod(s, day(1), true);
    for (let i = 0; i < 5; i++) s = tapMethod(s, day(1), 1);          // الأولى مع الثانية
    s = answerMethod(s, day(1), false);
    expect(s.hardVerses).toEqual({ 0: 1, 1: 1 });
    expect(methodChecked(s)).toBe(2);
  });

  it('reads a counter stored before the question as stages already answered', () => {
    const s = { ...atMemorize(3), method: { at: 0, taps: 12 } };
    expect(methodChecked(s)).toBe(2);
    expect(methodPosition(3, 12)).toMatchObject({ stageIndex: 2, rep: 2, asking: false });
  });

  it('starts from zero for the next portion, after a cancel, and when the portion size changes', () => {
    let s = atMemorize(1);
    s = tapMethod(s, day(1), 1);
    expect(methodTaps(cancelSession(s, day(1)))).toBe(0);
    expect(methodTaps(changeVersesPerDay(s, day(1), 3))).toBe(0);

    s = tickStep(s, day(1), 'memorize');
    s = recordStep(s, day(1), 'record', 'recorded');
    s = recordStep(s, day(1), 'record', 'reviewed');
    for (let i = 0; i < 40; i++) s = countStep(s, day(1), 'repeat', 1);
    s = confirmStep(s, day(1), 'repeat');
    expect(s.memorizedOn).toHaveLength(1);
    expect(methodTaps(s)).toBe(0);
  });
});

describe('listening 3, 5 or 7 times', () => {
  it('changes how many listens the first step needs, keeping those already done', () => {
    let s = startProgram('forward', day(1));
    s = countStep(s, day(1), 'listen', 1);
    s = changeListenTarget(s, 7);
    expect(s.rules.listenTarget).toBe(7);
    expect(s.progress.listen).toBe(1);
    for (let i = 0; i < 2; i++) s = countStep(s, day(1), 'listen', 1);
    expect(currentStep(s.progress, s.rules)).toBe('listen');   // 3 لا تكفي من 7
    for (let i = 0; i < 4; i++) s = countStep(s, day(1), 'listen', 1);
    expect(currentStep(s.progress, s.rules)).toBe('hafiz');
  });

  it('ignores values that are not offered', () => {
    const s = startProgram('forward', day(1));
    expect(changeListenTarget(s, 4)).toBe(s);
    expect(changeListenTarget(s, 3)).toBe(s);
  });
});

describe('repeat count set by the memoriser (1–100)', () => {
  it('defaults to 40 and accepts any whole number from 1 to 100', () => {
    let s = startProgram('forward', day(1));
    expect(s.rules.repeatTarget).toBe(40);
    s = changeRepeatTarget(s, 1);
    expect(s.rules.repeatTarget).toBe(1);
    s = changeRepeatTarget(s, 100);
    expect(s.rules.repeatTarget).toBe(100);
  });

  it('ignores values outside the range or not whole', () => {
    const s = startProgram('forward', day(1));
    for (const bad of [0, 101, -5, 2.5, NaN, '20']) expect(changeRepeatTarget(s, bad)).toBe(s);
    expect(changeRepeatTarget(s, 40)).toBe(s);
  });

  it('a lower count lets the repeats already done reach it', () => {
    let s = startProgram('forward', day(1));
    for (let i = 0; i < 3; i++) s = countStep(s, day(1), 'listen', 1);
    s = tickStep(tickStep(s, day(1), 'hafiz'), day(1), 'memorize');
    s = recordStep(s, day(1), 'record', 'recorded');
    s = recordStep(s, day(1), 'record', 'reviewed');
    for (let i = 0; i < 10; i++) s = countStep(s, day(1), 'repeat', 1);
    s = changeRepeatTarget(s, 10);
    s = confirmStep(s, day(1), 'repeat');
    expect(s.memorizedOn).toHaveLength(1);
  });
});
