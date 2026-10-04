import { useState, useEffect, useCallback, useMemo } from 'react';
import { dayKey } from '../utils/hifzSchedule';
import {
  startProgram, loadProgram, rollDay, dailyPlan, countStep, confirmStep, tickStep, recordStep, checkBox,
  shouldCelebrate, markCelebrated, openExtraPortion, changeVersesPerDay,
} from '../utils/hifzState';

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
 * @param persisted حالة البرنامج المخزّنة (أو لا شيء إن لم يبدأ بعد)
 */
export default function useHifz(persisted) {
  const [program, setProgram] = useState(() => loadProgram(persisted));
  const today = useToday();

  // كل حدث: دخول اليوم الجديد أولاً (تصفير شكّات الصناديق) ثم تطبيق الحدث
  const apply = useCallback((event) => {
    setProgram((prev) => (prev ? event(rollDay(prev, today)) : prev));
  }, [today]);

  const actions = useMemo(() => ({
    start: (direction, versesPerDay, origin = 0) => setProgram(startProgram(direction, today, { versesPerDay }, origin)),
    reset: () => setProgram(null),
    count: (id, delta) => apply((p) => countStep(p, today, id, delta)),
    confirm: (id) => apply((p) => confirmStep(p, today, id)),
    tick: (id) => apply((p) => tickStep(p, today, id)),
    record: (id, part) => apply((p) => recordStep(p, today, id, part)),
    checkBox: (box, done) => apply((p) => checkBox(p, today, box, done)),
    celebrated: () => apply((p) => markCelebrated(p, today)),
    extraPortion: () => apply((p) => openExtraPortion(p, today)),
    setVersesPerDay: (n) => apply((p) => changeVersesPerDay(p, today, n)),
  }), [apply, today]);

  const plan = useMemo(() => (program ? dailyPlan(program, today) : null), [program, today]);
  const celebrate = program ? shouldCelebrate(program, today) : false;

  return { program, today, plan, celebrate, actions };
}
