import {
  TOTAL_VERSES, DIRECTIONS, DEFAULT_RULES, withDefaultRules,
  boxesFor, verseAt, daysBetween,
} from './hifzSchedule';
import { STEP_DEFS, freshProgress, normalizeProgress, currentStep, stepTarget, stepCount } from './hifzSteps';

// ─── برنامج الحفظ: الحالة ───
// دوال صرفة: (الحالة، الحدث) ← حالة جديدة. التخزين والواجهة خارجها.
//
// status و dayLog طبقة مستقلة عمداً: الإشراف (إيقاف الحساب، التجميد بعذر) مؤجَّل،
// وحين يُضاف يقرأ سجلّ الأيام ويضبط status من الخادم دون تغيير منطق الصناديق.

export const HIFZ_VERSION = 1;
export const STATUS = { ACTIVE: 'active', FROZEN: 'frozen', HALTED: 'halted' };
export const BOXES = ['five', 'daily', 'review'];

const freshChecks = (day) => ({ day, five: false, daily: false, review: false });

export function startProgram(direction, today, rules = DEFAULT_RULES) {
  const fullRules = withDefaultRules(rules);
  return {
    version: HIFZ_VERSION,
    status: STATUS.ACTIVE,
    rules: fullRules,
    direction: direction === DIRECTIONS.BACKWARD ? DIRECTIONS.BACKWARD : DIRECTIONS.FORWARD,
    startedOn: today,
    memorizedOn: [],                     // يوم حفظ كل آية بترتيب الحفظ
    progress: freshProgress(fullRules),  // تقدّم الآية الجارية — يبقى إن لم تُنجَز في يومها
    checks: freshChecks(today),
    celebratedOn: null,                  // آخر يوم عُرض فيه تنبيه الإتمام
    dayLog: {},                          // { 'YYYY-MM-DD': { verse, boxes } } — للإشراف لاحقاً
  };
}

// يقبل حالة مخزّنة فقط إن كانت بالصيغة المعروفة، ويكمّل ما أُضيف بعدها من قواعد وخطوات
export function loadProgram(raw) {
  if (!raw || raw.version !== HIFZ_VERSION || !Array.isArray(raw.memorizedOn) || !raw.startedOn) return null;
  const rules = withDefaultRules(raw.rules);
  return {
    ...raw,
    rules,
    progress: normalizeProgress(raw.progress, rules),
    checks: { ...freshChecks(raw.startedOn), ...raw.checks },
    celebratedOn: raw.celebratedOn ?? null,
    dayLog: raw.dayLog || {},
  };
}

// آية جديدة واحدة في اليوم على الأكثر
export const verseDoneToday = (state, today) => state.memorizedOn[state.memorizedOn.length - 1] === today;

/**
 * خطة اليوم: ما يظهر في الخط الزمني.
 * الصناديق الفارغة لا تُعدّ مهامّ. اليوم يكتمل بإنجاز آية اليوم وكل صندوق فيه آيات.
 */
export function dailyPlan(state, today) {
  const checks = state.checks.day === today ? state.checks : freshChecks(today);
  const boxes = boxesFor(state.memorizedOn, state.startedOn, today, state.rules);
  const finished = state.memorizedOn.length >= TOTAL_VERSES;
  const doneToday = verseDoneToday(state, today);
  const index = doneToday ? state.memorizedOn.length - 1 : state.memorizedOn.length;

  const boxItems = BOXES
    .filter((box) => boxes[box].length > 0)
    .map((box) => ({ box, indices: boxes[box], done: checks[box] }));
  const boxesDone = boxItems.every((item) => item.done);
  const verseNeeded = !finished || doneToday;

  return {
    verse: verseNeeded ? { index, ref: verseAt(state.direction, index), done: doneToday } : null,
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
  // إنجاز آخر خطوة يُتمّ حفظ الآية: تُسجَّل بيومها وتبدأ ساعتها
  if (currentStep(progress, state.rules) !== null) return next;
  return logDay({ ...next, memorizedOn: [...state.memorizedOn, today], progress: freshProgress(state.rules) }, today);
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

// تنبيه الإتمام يُعرض مرة واحدة في اليوم
export const shouldCelebrate = (state, today) => dailyPlan(state, today).complete && state.celebratedOn !== today;
export const markCelebrated = (state, today) => ({ ...state, celebratedOn: today });
