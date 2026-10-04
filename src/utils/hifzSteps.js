// ─── برنامج الحفظ: تعريف خطوات الآية الجديدة ───
// كل خطوة موصوفة هنا مرة واحدة: نوع تقدّمها وشرط إتمامها. ترتيب الخطوات وأيّها مفعَّل
// يأتيان من rules.steps، فإضافة خطوة جديدة = تعريف هنا + لوحة أداتها في الواجهة،
// وحذف خطوة أو إعادة ترتيبها = تعديل القائمة في القواعد فقط.
//
// أنواع التقدّم:
//   count  عدّاد يبلغ هدفاً (value: رقم). مع confirm: true لا تتمّ الخطوة ببلوغ الهدف
//          وحده بل بزرّ تأكيد بعده (value: { count, confirmed }) — يحمي من ضغطة خاطئة.
//   check  شكّ يدوي (value: true/false)
//   record تسجيل ثم سماعه (value: { recorded, reviewed })
export const STEP_DEFS = {
  listen: { kind: 'count', target: (rules) => rules.listenTarget },
  hafiz: { kind: 'check' },
  memorize: { kind: 'check' },
  record: { kind: 'record' },
  repeat: { kind: 'count', confirm: true, target: (rules) => rules.repeatTarget },
};

const initialValue = (def) => {
  if (def.kind === 'count') return def.confirm ? { count: 0, confirmed: false } : 0;
  if (def.kind === 'record') return { recorded: false, reviewed: false };
  return false;
};

// تقدّم فارغ لكل الخطوات المفعَّلة
export function freshProgress(rules) {
  return Object.fromEntries(rules.steps.map((id) => [id, initialValue(STEP_DEFS[id])]));
}

// تقدّم مخزّن ← تقدّم يطابق القواعد الحالية: خطوة أُضيفت لاحقاً تبدأ فارغة، وعدّاد
// خُزّن رقماً قبل إضافة التأكيد يُحوَّل إلى { count, confirmed }
export function normalizeProgress(progress, rules) {
  const merged = { ...freshProgress(rules), ...(progress || {}) };
  for (const id of rules.steps) {
    if (STEP_DEFS[id].confirm && typeof merged[id] === 'number') merged[id] = { count: merged[id], confirmed: false };
  }
  return merged;
}

export const stepTarget = (id, rules) => STEP_DEFS[id].target?.(rules) ?? null;

// قيمة عدّاد الخطوة، سواء خُزّنت رقماً أو مع تأكيد
export const stepCount = (id, value) => (STEP_DEFS[id].confirm ? value?.count ?? 0 : value ?? 0);

export function isStepDone(id, value, rules) {
  const def = STEP_DEFS[id];
  if (def.kind === 'count') {
    const reached = stepCount(id, value) >= def.target(rules);
    return def.confirm ? reached && Boolean(value?.confirmed) : reached;
  }
  if (def.kind === 'record') return Boolean(value?.recorded && value?.reviewed);
  return Boolean(value);
}

// الخطوة المفتوحة الآن: أول خطوة غير منجزة بترتيب القواعد؛ null إن أُنجزت كلها
export const currentStep = (progress, rules) => (
  rules.steps.find((id) => !isStepDone(id, progress[id], rules)) ?? null
);
