import { SURAH_METADATA } from '../data/quranConstants';
import { juzOfPage } from '../data/juzPages';
import { pageOfVerse } from './versePage';
import { TOTAL_VERSES, verseAt } from './hifzSchedule';
import { STEP_DEFS, isStepDone, freshStepValue } from './hifzSteps';
import { STATUS, verseDoneToday } from './hifzState';

// ─── برنامج الحفظ: إعادة خطوة، وتقدّم اليوم، وتقدّم الجزء ───
// التنقّل بين الخطوات عرضٌ فقط (HifzSteps) ولا يمسّ الحالة؛ الترتيب الملزم يبقى في updateStep.

// خطوة منجزة من ورد لم يكتمل بعد. بعد إتمام الورد سُجّلت آياته محفوظة، فلا إعادة.
export const canRedoStep = (state, today, id) => (
  state.status === STATUS.ACTIVE
  && !verseDoneToday(state, today)
  && Boolean(STEP_DEFS[id]) && state.rules.steps.includes(id)
  && isStepDone(id, state.progress[id], state.rules)
);

// إعادة خطوة: يُمسح تقدّمها وحدها فتصير هي المفتوحة. ما أُنجز بعدها يبقى ويُنتظر حتى تتمّ.
export function redoStep(state, today, id) {
  if (!canRedoStep(state, today, id)) return state;
  const next = { ...state, progress: { ...state.progress, [id]: freshStepValue(id) } };
  // عدّاد طريقة الخماسيات تابع لخطوة الحفظ
  return id === 'memorize' ? { ...next, method: null } : next;
}

// تقدّم اليوم: خطوات الورد ثم صناديق المراجعة التي فيها آيات، كلٌّ منجز أو لا
export function dayProgress(state, plan) {
  const steps = plan.verse
    ? state.rules.steps.map((id) => plan.verse.done || isStepDone(id, state.progress[id], state.rules))
    : [];
  const boxes = plan.boxItems.map((item) => Boolean(item.done));
  const total = steps.length + boxes.length;
  const done = [...steps, ...boxes].filter(Boolean).length;
  return { steps, boxes, done, total, percent: total ? Math.round((done / total) * 100) : 100 };
}

const juzOfVerse = (ref) => juzOfPage(pageOfVerse(ref.s, ref.a));

// عدد آيات كل جزء (1–30) — يُحسب مرة واحدة
let juzTotals = null;
function versesPerJuz() {
  if (!juzTotals) {
    juzTotals = Array(31).fill(0);
    SURAH_METADATA.forEach((surah) => {
      for (let a = 1; a <= surah.verseCount; a++) juzTotals[juzOfVerse({ s: surah.id, a })]++;
    });
  }
  return juzTotals;
}

// الجزء الجاري (جزء الآية التالية في ترتيب الحفظ) وما حُفظ منه
export function juzProgress(state) {
  const count = state.memorizedOn.length;
  const juz = juzOfVerse(verseAt(state.direction, Math.min(count, TOTAL_VERSES - 1), state.origin));
  let memorized = 0;
  for (let i = 0; i < count; i++) {
    if (juzOfVerse(verseAt(state.direction, i, state.origin)) === juz) memorized++;
  }
  return { juz, memorized, total: versesPerJuz()[juz] };
}
