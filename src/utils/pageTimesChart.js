import { blockEndOf, blockStartOf } from '../data/pageBlocks';

// ─── بيانات مخطط أزمنة الصفحات في بطاقة العدّاد ───

// خانات المخطط: كل صفحات البطاقة بالترتيب، وما لم يُقرأ بعد seconds: null — فعدد الأعمدة ثابت
// (عدد صفحات الجزء: 20، أو 21 للأول و23 للأخير) سواء فُتحت البطاقة في أوّلها أو بعد اكتمالها.
// بطاقة تمتدّ على أكثر من جزء: خاناتها من أول صفحاتها إلى آخرها.
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
