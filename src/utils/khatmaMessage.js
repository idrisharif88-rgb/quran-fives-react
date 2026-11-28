// نصّ تهنئة إتمام الختمة في العدّاد (اختيار صاحب البرنامج: C).
// الختمة لم تُسجَّل بعد في «ختماتي»، فرقمها = المسجّلة + 1. إن كانت «ختماتي» مقفلة
// فعددها غير معروف، فيُكتفى بالنصّ العامّ.
export const KHATMA_DONE_TITLE = 'ختمة مباركة';
export const KHATMA_DONE_BUTTON = 'الحمد لله';

export function khatmaDoneMessage(recordedCount, totalPages) {
  if (Number.isInteger(recordedCount) && recordedCount >= 0) {
    return `هذه ختمتك رقم ${recordedCount + 1}. تقبّل الله منك وجعلها حجّة لك.`;
  }
  return `أتممت قراءة القرآن الكريم كاملاً، ${totalPages} صفحات. تقبّل الله منك.`;
}
