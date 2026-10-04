import { pageOfVerse } from './versePage';

// آيات التسجيل بترتيب تلاوتها. تسجيل ورد متعدّد يحمل refs؛ التسجيلات الأقدم آية واحدة.
export const recordingRefs = (recording) => (
  recording.refs?.length ? recording.refs.filter(Boolean) : [{ s: recording.s, a: recording.a }]
);

// مفاتيح «سورة:آية» كما تحملها كلمات صفحة المصحف
export const verseKeys = (refs) => refs.map((ref) => `${ref.s}:${ref.a}`);

// صفحات المصحف التي تقع فيها الآيات، بترتيب التلاوة وبلا تكرار — ورد قد يمتدّ على صفحتين
export function pagesOfRefs(refs) {
  const pages = [];
  for (const ref of refs) {
    const page = pageOfVerse(ref.s, ref.a);
    if (!pages.includes(page)) pages.push(page);
  }
  return pages;
}
