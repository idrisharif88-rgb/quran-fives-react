// ─── طريقة الخماسيات في الحفظ ───
// منطق صرف. ورد اليوم (1 أو 3 أو 5 أو 7 آيات) يُحفظ آيةً آية:
//   كل آية تُكرَّر غيباً METHOD_REPS مرات، ثم تُجمع مع ما قبلها من الورد METHOD_REPS مرات،
//   حتى يُقرأ الورد كلّه مجموعاً.
// التقدّم: taps = مجموع التكرارات المنجزة منذ أوّل الورد، وchecked = المراحل التي أجاب
// فيها الحافظ «نعم، حفظي جيد». بعد الخامسة يُسأل؛ «لا» تعيد المرحلة خمساً أخرى.
// برنامج خُزّن قبل السؤال لا checked فيه: كانت المراحل تنتقل وحدها بعد الخامسة.
export const METHOD_REPS = 5;

// مراحل ورد من count آيات: [{ from, to }] بفهارس آيات الورد (من صفر، شاملة).
// link: مرحلة «الربط» أخيرة — آخر آية من الأمس موصولة بأول آية اليوم ({ link: true, from: 0, to: 0 }).
// تُضاف في الآخر فلا تتغيّر أرقام المراحل قبلها في تقدّم مخزّن.
export function methodStages(count, link = false) {
  const stages = [];
  for (let i = 0; i < count; i++) {
    stages.push({ from: i, to: i });           // الآية وحدها
    if (i > 0) stages.push({ from: 0, to: i }); // ثم مع ما قبلها
  }
  if (link && count > 0) stages.push({ link: true, from: 0, to: 0 });
  return stages;
}

export const methodTotal = (count, link = false) => methodStages(count, link).length * METHOD_REPS;

export const legacyChecked = (taps) => Math.floor(Math.max(0, taps) / METHOD_REPS);

// أين وصل: المرحلة الجارية وتكراراتها المنجزة. asking: أتمّ خمسها وينتظر جوابه.
// done بعد «نعم» في آخر مرحلة.
export function methodPosition(count, taps, checked = legacyChecked(taps), link = false) {
  const stages = methodStages(count, link);
  const done = checked >= stages.length;
  const stageIndex = done ? stages.length - 1 : checked;
  const rep = done ? METHOD_REPS : Math.min(METHOD_REPS, Math.max(0, taps - checked * METHOD_REPS));
  return {
    done,
    asking: !done && rep === METHOD_REPS,
    stageIndex,
    stageCount: stages.length,
    stage: stages[stageIndex],
    rep,
  };
}
