import {
  TOTAL_VERSES, DIRECTIONS, DEFAULT_RULES, VERSES_PER_DAY_CHOICES, LISTEN_CHOICES, withDefaultRules,
  boxesFor, verseAt, daysBetween, addDays,
} from './hifzSchedule';
import { STEP_DEFS, freshProgress, normalizeProgress, currentStep, stepTarget, stepCount } from './hifzSteps';
import { METHOD_REPS, methodPosition, legacyChecked } from './hifzMethod';

// ─── برنامج الحفظ: الحالة ───
// دوال صرفة: (الحالة، الحدث) ← حالة جديدة. التخزين والواجهة خارجها.
//
// status و dayLog طبقة مستقلة عمداً: الإشراف (إيقاف الحساب، التجميد بعذر) مؤجَّل،
// وحين يُضاف يقرأ سجلّ الأيام ويضبط status من الخادم دون تغيير منطق الصناديق.

export const HIFZ_VERSION = 1;
export const STATUS = { ACTIVE: 'active', FROZEN: 'frozen', HALTED: 'halted' };
export const BOXES = ['five', 'daily', 'review'];

const freshChecks = (day) => ({ day, five: false, daily: false, review: false });

// موضع صالح لآية البداية، وإلا صفر (أول الترتيب)
const validOrigin = (origin) => (Number.isInteger(origin) && origin > 0 && origin < TOTAL_VERSES ? origin : 0);

// origin: فهرس آية البداية في ترتيب الحفظ (صفر = أول المصحف أو آخره حسب الاتجاه)
export function startProgram(direction, today, rules = DEFAULT_RULES, origin = 0) {
  const fullRules = withDefaultRules(rules);
  return {
    version: HIFZ_VERSION,
    status: STATUS.ACTIVE,
    rules: fullRules,
    direction: direction === DIRECTIONS.BACKWARD ? DIRECTIONS.BACKWARD : DIRECTIONS.FORWARD,
    origin: validOrigin(origin),
    startedOn: today,
    memorizedOn: [],                     // يوم حفظ كل آية بترتيب الحفظ
    progress: freshProgress(fullRules),  // تقدّم الآية الجارية — يبقى إن لم تُنجَز في يومها
    checks: freshChecks(today),
    celebratedOn: null,                  // آخر يوم عُرض فيه تنبيه الإتمام
    shift: 0,                            // أيام سُبق بها التقويم بفتح أوراد إضافية (effectiveDay)
    dayLog: {},                          // { 'YYYY-MM-DD': { verse, boxes } } — للإشراف لاحقاً
    hardVerses: {},                      // { موضع: عدد مرات «لا» في طريقة الخماسيات }
  };
}

// يقبل حالة مخزّنة فقط إن كانت بالصيغة المعروفة، ويكمّل ما أُضيف بعدها من قواعد وخطوات
export function loadProgram(raw) {
  if (!raw || raw.version !== HIFZ_VERSION || !Array.isArray(raw.memorizedOn) || !raw.startedOn) return null;
  const rules = withDefaultRules(raw.rules);
  return {
    ...raw,
    rules,
    origin: validOrigin(raw.origin),   // برنامج خُزّن قبل الإضافة يبدأ من طرف المصحف
    progress: normalizeProgress(raw.progress, rules),
    checks: { ...freshChecks(raw.startedOn), ...raw.checks },
    celebratedOn: raw.celebratedOn ?? null,
    shift: Number.isInteger(raw.shift) && raw.shift > 0 ? raw.shift : 0,
    dayLog: raw.dayLog || {},
    hardVerses: raw.hardVerses || {},
  };
}

// يوم البرنامج: يوم التقويم مزاحاً بـshift. جدول المراجعة مربوط بالمحفوظ لا بالتقويم:
// من فتح ورداً إضافياً في اليوم نفسه دخل «يوماً جديداً» من أيام البرنامج، فيصير ما حفظه
// قبل قليل «آيات الأمس» وتتقدّم الصناديق كلّها يوماً. كل دوالّ هذا الملف تأخذ يوم
// البرنامج في معاملها today — الواجهة تحسبه بـeffectiveDay قبل استدعائها.
export const effectiveDay = (state, today) => addDays(today, state?.shift || 0);

// ورد جديد واحد في يوم البرنامج على الأكثر (آية أو أكثر حسب rules.versesPerDay)
export const verseDoneToday = (state, today) => (
  state.memorizedOn[state.memorizedOn.length - 1] === today
);

// ورد اليوم: آياته المتتالية في ترتيب الحفظ. يُحفظ وحدةً واحدة بالخطوات نفسها،
// ويُسجَّل لكل آية منه يومُ حفظها فتدخل الصناديق كلٌّ بساعتها.
//   start فهرس أول آية — count عدد الآيات (يقصر عند آخر المصحف) — done حُفظ اليوم
export function portionOf(state, today) {
  const total = state.memorizedOn.length;
  let doneCount = 0;
  while (doneCount < total && state.memorizedOn[total - 1 - doneCount] === today) doneCount++;
  if (doneCount > 0) return { start: total - doneCount, count: doneCount, done: true };
  return { start: total, count: Math.min(state.rules.versesPerDay, TOTAL_VERSES - total), done: false };
}

/**
 * خطة اليوم: ما يظهر في الخط الزمني.
 * الصناديق الفارغة لا تُعدّ مهامّ. اليوم يكتمل بإنجاز آية اليوم وكل صندوق فيه آيات.
 */
export function dailyPlan(state, today) {
  const checks = state.checks.day === today ? state.checks : freshChecks(today);
  const boxes = boxesFor(state.memorizedOn, state.startedOn, today, state.rules);
  const finished = state.memorizedOn.length >= TOTAL_VERSES;
  const doneToday = verseDoneToday(state, today);
  const portion = portionOf(state, today);
  const indices = Array.from({ length: portion.count }, (_, i) => portion.start + i);

  const boxItems = BOXES
    .filter((box) => boxes[box].length > 0)
    .map((box) => ({ box, indices: boxes[box], done: checks[box] }));
  const boxesDone = boxItems.every((item) => item.done);
  const verseNeeded = !finished || doneToday;

  return {
    // index/ref أول آية الورد؛ indices/refs آياته كلّها (واحدة حين versesPerDay = 1)
    verse: verseNeeded ? {
      index: portion.start,
      ref: verseAt(state.direction, portion.start, state.origin),
      indices,
      refs: indices.map((i) => verseAt(state.direction, i, state.origin)),
      done: doneToday,
    } : null,
    openStep: doneToday || finished ? null : currentStep(state.progress, state.rules),
    boxItems,
    boxesDone,
    complete: boxesDone && (!verseNeeded || doneToday),
  };
}

// ─── الأحداث ───
// تصفير شكّات الصناديق عند دخول يوم جديد. الساعة إن رجعت إلى الوراء لا تُرجِع اليوم.
export function rollDay(state, today) {
  if (state.checks.day === today || daysBetween(state.checks.day, today) < 0) return state;
  return { ...state, checks: freshChecks(today) };
}

const logDay = (state, today) => {
  const plan = dailyPlan(state, today);
  return {
    ...state,
    dayLog: { ...state.dayLog, [today]: { verse: plan.verse ? plan.verse.done : true, boxes: plan.boxesDone } },
  };
};

// تعديل تقدّم خطوة — يُرفض إن لم تكن هي الخطوة المفتوحة (الترتيب ملزم)
function updateStep(state, today, id, change) {
  if (state.status !== STATUS.ACTIVE || verseDoneToday(state, today)) return state;
  if (currentStep(state.progress, state.rules) !== id) return state;
  const progress = { ...state.progress, [id]: change(state.progress[id]) };
  const next = { ...state, progress };
  // إنجاز آخر خطوة يُتمّ حفظ ورد اليوم: كل آية منه تُسجَّل بيومها وتبدأ ساعتها
  if (currentStep(progress, state.rules) !== null) return next;
  const learned = Array(portionOf(state, today).count).fill(today);
  return logDay({ ...next, memorizedOn: [...state.memorizedOn, ...learned], progress: freshProgress(state.rules) }, today);
}

// خطوة عدّاد: زيادة أو نقص أو تصفير ('reset')، بين 0 والهدف
export function countStep(state, today, id, delta) {
  const def = STEP_DEFS[id];
  if (def?.kind !== 'count') return state;
  const target = stepTarget(id, state.rules);
  return updateStep(state, today, id, (value) => {
    const count = delta === 'reset' ? 0 : Math.min(target, Math.max(0, stepCount(id, value) + delta));
    return def.confirm ? { count, confirmed: false } : count;
  });
}

// تأكيد عدّاد بلغ هدفه (للخطوات التي تطلب تأكيداً) — قبل الهدف لا يفعل شيئاً
export function confirmStep(state, today, id) {
  const def = STEP_DEFS[id];
  if (def?.kind !== 'count' || !def.confirm) return state;
  return updateStep(state, today, id, (value) => (
    stepCount(id, value) >= stepTarget(id, state.rules) ? { ...value, confirmed: true } : value
  ));
}

// خطوة شكّ يدوي
export function tickStep(state, today, id) {
  if (STEP_DEFS[id]?.kind !== 'check') return state;
  return updateStep(state, today, id, () => true);
}

// خطوة تسجيل: يُسجَّل المقطع، ثم يُسمع، ثم يحكم صاحبه عليه.
//   'recorded' حُفظ مقطع — 'reviewed' سُمع ووُجد صحيحاً (تتمّ الخطوة)
//   'retry'    سُمع وفيه خطأ: تعود الخطوة إلى التسجيل من جديد
export function recordStep(state, today, id, part) {
  if (STEP_DEFS[id]?.kind !== 'record') return state;
  return updateStep(state, today, id, (value) => {
    if (part === 'recorded') return { ...value, recorded: true };
    if (part === 'retry') return { recorded: false, reviewed: false };
    return value.recorded ? { ...value, reviewed: true } : value;
  });
}

// شكّ صندوق (واحد لكل صندوق) — مفتوح في أي وقت، ولا يُشكّ صندوق فارغ
export function checkBox(state, today, box, done = true) {
  const rolled = rollDay(state, today);
  if (!BOXES.includes(box)) return rolled;
  if (boxesFor(rolled.memorizedOn, rolled.startedOn, today, rolled.rules)[box].length === 0) return rolled;
  return logDay({ ...rolled, checks: { ...rolled.checks, [box]: done } }, today);
}

// ورد إضافي في يوم التقويم نفسه: يتقدّم يوم البرنامج يوماً (shift)، فيُفتح الورد التالي
// ومعه مهامّ يومه — تكرار ما حُفظ قبله (آيات الأمس)، والربط، والمراجعة.
// لا يُفتح إلا ويوم البرنامج الجاري تامّ (ورده وصناديقه كلّها) والمصحف لم يُختم:
// من ترك مراجعة يومٍ لا ينتقل إلى الذي بعده.
export function openExtraPortion(state, today) {
  if (state.status !== STATUS.ACTIVE || !dailyPlan(state, today).complete) return state;
  if (state.memorizedOn.length >= TOTAL_VERSES) return state;
  return { ...state, shift: (state.shift || 0) + 1 };
}

// تغيير ورد اليوم (1/3/5/7) دون إعادة ضبط البرنامج: ما حُفظ وصناديقه لا تُمسّ، والعدد
// الجديد يسري من أوّل ورد لم يُنجَز. ورد اليوم إن كان جارياً تتغيّر آياته، فيُصفَّر تقدّم
// خطواته وحده (لا يصحّ أن يُحتسب سماعٌ أو تكرار لآيات غير التي ستُحفظ).
export function changeVersesPerDay(state, today, versesPerDay) {
  if (!VERSES_PER_DAY_CHOICES.includes(versesPerDay) || versesPerDay === state.rules.versesPerDay) return state;
  const rules = { ...state.rules, versesPerDay };
  return {
    ...state,
    rules,
    progress: verseDoneToday(state, today) ? state.progress : freshProgress(rules),
    method: null,   // مراحل الطريقة تتبع عدد آيات الورد
  };
}

// عدد مرات سماع المقرئ (3 أو 5 أو 7). ما سُمع يبقى محسوباً؛ إن بلغ العددَ الجديد تمّت الخطوة.
export function changeListenTarget(state, listenTarget) {
  if (!LISTEN_CHOICES.includes(listenTarget) || listenTarget === state.rules.listenTarget) return state;
  return { ...state, rules: { ...state.rules, listenTarget } };
}

// ─── طريقة الخماسيات (hifzMethod.js) ───
// عدّادها يُحفظ مع البرنامج: method = { at, taps, checked } — at عدد المحفوظ حين بدأ العدّ،
// فعدّاد وردٍ سابق لا يُحتسب للورد التالي.
const currentMethod = (state) => {
  if (state.method?.at !== state.memorizedOn.length) return { taps: 0, checked: 0 };
  const { taps } = state.method;
  return { taps, checked: Number.isInteger(state.method.checked) ? state.method.checked : legacyChecked(taps) };
};
export const methodTaps = (state) => currentMethod(state).taps;
export const methodChecked = (state) => currentMethod(state).checked;

const inMemorize = (state, today) => (
  state.status === STATUS.ACTIVE && !verseDoneToday(state, today)
  && currentStep(state.progress, state.rules) === 'memorize'
);

// ضغطة في الطريقة: زيادة أو نقص أو 'reset' — في خطوة الحفظ وحدها، وداخل المرحلة الجارية:
// لا يتجاوز خمسها قبل الجواب، ولا ينقص إلى مرحلة أُجيب عنها.
// بلوغ آخرها لا يُتمّ الخطوة؛ يُتمّها صاحبها بتأكيده (tickStep).
export function tapMethod(state, today, delta) {
  if (!inMemorize(state, today)) return state;
  const at = state.memorizedOn.length;
  if (delta === 'reset') return { ...state, method: { at, taps: 0, checked: 0 } };
  const { taps, checked } = currentMethod(state);
  const next = Math.min((checked + 1) * METHOD_REPS, Math.max(checked * METHOD_REPS, taps + delta));
  return { ...state, method: { at, taps: next, checked } };
}

// جواب «هل حفظك جيد؟» بعد خمس المرحلة: نعم ← المرحلة التالية، لا ← خمس أخرى، ويُعدّ
// على أحدث آية في المرحلة في hardVerses { [موضعها في ترتيب الحفظ]: عدد مرات «لا» }.
export function answerMethod(state, today, good) {
  if (!inMemorize(state, today)) return state;
  const portion = portionOf(state, today);
  const { taps, checked } = currentMethod(state);
  const pos = methodPosition(portion.count, taps, checked);
  if (!pos.asking) return state;
  const at = state.memorizedOn.length;
  if (good) return { ...state, method: { at, taps, checked: checked + 1 } };
  const key = portion.start + pos.stage.to;
  const hardVerses = { ...state.hardVerses, [key]: (state.hardVerses?.[key] || 0) + 1 };
  return { ...state, hardVerses, method: { at, taps: taps - METHOD_REPS, checked } };
}

// جلسة اليوم: خطوات الورد الجاري. بدأت = فيها تقدّم ولم يكتمل الورد بعد.
export const sessionStarted = (state, today) => (
  !verseDoneToday(state, today)
  && JSON.stringify(state.progress) !== JSON.stringify(freshProgress(state.rules))
);

// إلغاء جلسة اليوم: تعود خطوات الورد الجاري إلى أوّلها. ما حُفظ والصناديق لا تُمسّ،
// وورد اليوم المنجز لا يُلغى.
export function cancelSession(state, today) {
  if (!sessionStarted(state, today)) return state;
  return { ...state, progress: freshProgress(state.rules), method: null };
}

// تنبيه الإتمام يُعرض مرة واحدة في اليوم
export const shouldCelebrate = (state, today) => dailyPlan(state, today).complete && state.celebratedOn !== today;
export const markCelebrated = (state, today) => ({ ...state, celebratedOn: today });
