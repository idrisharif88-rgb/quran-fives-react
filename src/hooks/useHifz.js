import { useState, useEffect, useCallback, useMemo } from 'react';
import { dayKey } from '../utils/hifzSchedule';
import {
  startProgram, loadProgram, rollDay, dailyPlan, countStep, confirmStep, tickStep, recordStep, checkBox,
  shouldCelebrate, markCelebrated, openExtraPortion, changeVersesPerDay, cancelSession, sessionStarted,
  effectiveDay, tapMethod, answerMethod, methodTaps, methodChecked, changeListenTarget,
} from '../utils/hifzState';
import { skipStep, nextTrialDay, jumpTrialDays } from '../utils/hifzTrial';

// اليوم الحالي، يتجدّد عند منتصف الليل وعند عودة التطبيق من الخلفية
function useToday() {
  const [today, setToday] = useState(() => dayKey());
  useEffect(() => {
    const refresh = () => setToday(dayKey());
    const timer = setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return today;
}

/**
 * برنامج الحفظ: الحالة المحفوظة + خطة اليوم + الأحداث.
 * المنطق كله في utils/hifzState؛ هنا ربطه بالحالة وباليوم الجاري فقط.
 * today في ما يعيده هو يوم البرنامج (effectiveDay) لا يوم التقويم.
 * @param persisted حالة البرنامج المخزّنة (أو لا شيء إن لم يبدأ بعد)
 */
export default function useHifz(persisted) {
  const [program, setProgram] = useState(() => loadProgram(persisted));
  const calendarDay = useToday();
  // يوم البرنامج: يسبق التقويم بعدد الأوراد الإضافية المفتوحة (المراجعة مربوطة بالمحفوظ)
  const today = program ? effectiveDay(program, calendarDay) : calendarDay;

  // كل حدث: دخول اليوم الجديد أولاً (تصفير شكّات الصناديق) ثم تطبيق الحدث.
  // يوم البرنامج يُحسب من الحالة السابقة نفسها، فحدثان متتاليان لا يريان يوماً قديماً.
  const apply = useCallback((event) => {
    setProgram((prev) => {
      if (!prev) return prev;
      const day = effectiveDay(prev, calendarDay);
      return event(rollDay(prev, day), day);
    });
  }, [calendarDay]);

  const actions = useMemo(() => ({
    start: (direction, versesPerDay, origin = 0) => setProgram(startProgram(direction, calendarDay, { versesPerDay }, origin)),
    reset: () => setProgram(null),
    count: (id, delta) => apply((p, day) => countStep(p, day, id, delta)),
    confirm: (id) => apply((p, day) => confirmStep(p, day, id)),
    tick: (id) => apply((p, day) => tickStep(p, day, id)),
    record: (id, part) => apply((p, day) => recordStep(p, day, id, part)),
    checkBox: (box, done) => apply((p, day) => checkBox(p, day, box, done)),
    celebrated: () => apply((p, day) => markCelebrated(p, day)),
    extraPortion: () => apply((p, day) => openExtraPortion(p, day)),
    setVersesPerDay: (n) => apply((p, day) => changeVersesPerDay(p, day, n)),
    setListenTarget: (n) => apply((p) => changeListenTarget(p, n)),
    cancelSession: () => apply((p, day) => cancelSession(p, day)),
    methodTap: (delta) => apply((p, day) => tapMethod(p, day, delta)),
    methodAnswer: (good) => apply((p, day) => answerMethod(p, day, good)),
    // وضع التجربة وحده (الواجهة لا تعرضهما للبرنامج الحقيقي)
    skip: () => apply((p, day) => skipStep(p, day)),
    nextDay: () => apply((p) => nextTrialDay(p)),
    jumpDays: (n) => setProgram((prev) => (prev ? jumpTrialDays(prev, calendarDay, n) : prev)),
  }), [apply, calendarDay]);

  const plan = useMemo(() => (program ? dailyPlan(program, today) : null), [program, today]);
  const celebrate = program ? shouldCelebrate(program, today) : false;
  const inSession = program ? sessionStarted(program, today) : false;

  const method = program ? { taps: methodTaps(program), checked: methodChecked(program) } : { taps: 0, checked: 0 };

  return { program, today, plan, celebrate, inSession, method, actions };
}
