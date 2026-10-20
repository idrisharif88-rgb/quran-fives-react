import { blockEndOf, blockStartOf } from '../data/pageBlocks';

// ─── بيانات مخطط أزمنة الصفحات في بطاقة العدّاد ───

// خانات المخطط: كل صفحات البطاقة بالترتيب، وما لم يُقرأ بعد seconds: null — فعدد الأعمدة ثابت
// (10، أو 11 للأولى و13 للأخيرة) سواء فُتحت البطاقة في أوّلها أو بعد اكتمالها.
// البطاقات القديمة (جزء كامل) تمتدّ على أكثر من كتلة: خاناتها من أول صفحاتها إلى آخرها.
export function chartSlots(pageTimes) {
  if (!pageTimes?.length) return [];
  const pages = pageTimes.map((p) => p.page);
  const first = Math.min(...pages);
  const last = Math.max(...pages);
  const end = blockEndOf(first);
  const [from, to] = blockEndOf(last) === end ? [blockStartOf(end), end] : [first, last];
  const byPage = new Map(pageTimes.map((p) => [p.page, p.seconds]));
  const slots = [];
  for (let page = from; page <= to; page++) slots.push({ page, seconds: byPage.get(page) ?? null });
  return slots;
}

// خطوات المحور العمودي بالثواني: أربعة خطوط شبكة على الأكثر، بأرقام مستديرة
const STEPS = [15, 30, 60, 120, 300, 600];
const MAX_INTERVALS = 4;

export function axisFor(maxSeconds) {
  const top = Math.max(1, maxSeconds);
  const step = STEPS.find((s) => top / s <= MAX_INTERVALS) ?? STEPS[STEPS.length - 1];
  const max = Math.ceil(top / step) * step;
  const ticks = [];
  for (let s = 0; s <= max; s += step) ticks.push(s);
  return { max, ticks };
}
