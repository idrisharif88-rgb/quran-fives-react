// ─── طريقة الخماسيات في الحفظ ───
// منطق صرف. ورد اليوم (1 أو 3 أو 5 أو 7 آيات) يُحفظ آيةً آية:
//   كل آية تُكرَّر غيباً METHOD_REPS مرات، ثم تُجمع مع ما قبلها من الورد METHOD_REPS مرات،
//   حتى يُقرأ الورد كلّه مجموعاً.
// التقدّم عدد واحد: taps = مجموع التكرارات المنجزة منذ أوّل الورد.
export const METHOD_REPS = 5;

// مراحل ورد من count آيات: [{ from, to }] بفهارس آيات الورد (من صفر، شاملة)
export function methodStages(count) {
  const stages = [];
  for (let i = 0; i < count; i++) {
    stages.push({ from: i, to: i });           // الآية وحدها
    if (i > 0) stages.push({ from: 0, to: i }); // ثم مع ما قبلها
  }
  return stages;
}

export const methodTotal = (count) => methodStages(count).length * METHOD_REPS;

// أين وصل: المرحلة الجارية وعدد تكراراتها المنجزة؛ done بعد آخر تكرار في آخر مرحلة
export function methodPosition(count, taps) {
  const stages = methodStages(count);
  const done = taps >= stages.length * METHOD_REPS;
  const stageIndex = done ? stages.length - 1 : Math.floor(Math.max(0, taps) / METHOD_REPS);
  return {
    done,
    stageIndex,
    stageCount: stages.length,
    stage: stages[stageIndex],
    rep: done ? METHOD_REPS : Math.max(0, taps) % METHOD_REPS,
  };
}
