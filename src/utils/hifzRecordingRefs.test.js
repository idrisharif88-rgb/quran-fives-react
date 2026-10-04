import { describe, it, expect } from 'vitest';
import { recordingRefs, verseKeys, pagesOfRefs } from './hifzRecordingRefs';
import { startProgram, dailyPlan, rollDay, countStep, tickStep, recordStep, confirmStep } from './hifzState';
import { dayKey } from './hifzSchedule';

const day = (n) => dayKey(new Date(2026, 0, n));
function memorize(state, today) {
  let s = rollDay(state, today);
  for (let i = 0; i < 3; i++) s = countStep(s, today, 'listen', 1);
  s = tickStep(s, today, 'hafiz');
  s = tickStep(s, today, 'memorize');
  s = recordStep(s, today, 'record', 'recorded');
  s = recordStep(s, today, 'record', 'reviewed');
  for (let i = 0; i < 40; i++) s = countStep(s, today, 'repeat', 1);
  return confirmStep(s, today, 'repeat');
}

describe('الآيات المظلَّلة عند سماع التسجيل', () => {
  it('تسجيل قديم بلا refs: آيته وحدها', () => {
    expect(verseKeys(recordingRefs({ s: 2, a: 255 }))).toEqual(['2:255']);
  });

  it.each([1, 3, 5, 7])('ورد من %i: تُظلَّل آياته كلّها لا أولاها فقط', (n) => {
    const plan = dailyPlan(startProgram('forward', day(1), { versesPerDay: n }), day(1));
    const recording = { s: plan.verse.ref.s, a: plan.verse.ref.a, refs: plan.verse.refs };
    expect(verseKeys(recordingRefs(recording))).toEqual(Array.from({ length: n }, (_, i) => `1:${i + 1}`));
  });

  it('اليوم الثاني يظلّل ورده هو، لا ورد الأمس', () => {
    const s = memorize(startProgram('forward', day(1), { versesPerDay: 3 }), day(1));
    expect(verseKeys(dailyPlan(s, day(2)).verse.refs)).toEqual(['1:4', '1:5', '1:6']);
  });

  it('ورد يعبر من سورة إلى أخرى ومن صفحة إلى أخرى', () => {
    // ثلاث آيات يومياً: اليوم الثالث = الفاتحة 7 (ص 1) ثم البقرة 1–2 (ص 2)
    let s = startProgram('forward', day(1), { versesPerDay: 3 });
    s = memorize(s, day(1));
    s = memorize(s, day(2));
    const refs = dailyPlan(s, day(3)).verse.refs;
    expect(verseKeys(refs)).toEqual(['1:7', '2:1', '2:2']);
    expect(pagesOfRefs(refs)).toEqual([1, 2]);
  });

  it('من آخر المصحف: ترتيب التلاوة محفوظ', () => {
    let s = startProgram('backward', day(1), { versesPerDay: 7 });
    expect(verseKeys(dailyPlan(s, day(1)).verse.refs)).toEqual(['114:1', '114:2', '114:3', '114:4', '114:5', '114:6', '113:1']);
    s = memorize(s, day(1));
    const refs = dailyPlan(s, day(2)).verse.refs;
    expect(verseKeys(refs)).toEqual(['113:2', '113:3', '113:4', '113:5', '112:1', '112:2', '112:3']);
    expect(pagesOfRefs(refs)).toEqual([604]);
  });
});
