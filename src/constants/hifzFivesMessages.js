// رسائل نافذة «طريقة الخماسيات»: تُكتب كبيرة وتُنطق. كل رسالة { text, clips }:
// clips مفاتيح مقاطع صوتية مسجّلة في src/assets/voice/hifz (سجّلها المالك؛ بدائلها يولّدها scripts/generate-hifz-voice.mjs
// من النصوص المشكولة في scripts/hifz-voice-lines.json — المفاتيح هنا وهناك واحدة).
// كلمات قليلة واضحة تصلح للأطفال وكبار السن.

const ORDINALS = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة'];
export const ordinal = (i) => ORDINALS[i] ?? String(i + 1);

const CHEERS = ['أحسنت!', 'بارك الله فيك!'];

// عنوان المرحلة: ما يُقرأ الآن
export function stageTitle(stage, count) {
  if (stage.link) return 'الربط';
  if (stage.to > stage.from) return `من الأولى إلى ${ordinal(stage.to)}`;
  return count === 1 ? 'آية اليوم' : `الآية ${ordinal(stage.to)}`;
}

// ما يُطلب في المرحلة
export function stageMessage(stage, count) {
  if (stage.link) return { text: 'اربط آخر محفوظ بأول آية، خمس مرات.', clips: ['link'] };
  if (stage.to > stage.from) {
    return { text: `من الأولى إلى ${ordinal(stage.to)}، خمس مرات.`, clips: [`join-${stage.to}`] };
  }
  if (count === 1) return { text: 'كرّر الآية خمس مرات.', clips: ['single'] };
  return { text: `الآية ${ordinal(stage.to)}، خمس مرات.`, clips: [`alone-${stage.to}`] };
}

// تشجيع بعد «نعم» ثم ما يُطلب في المرحلة التالية
export function withCheer(stageIndex, message) {
  const i = stageIndex % CHEERS.length;
  return { text: `${CHEERS[i]} ${message.text}`, clips: [`cheer-${i}`, ...message.clips] };
}

export const ASK = { text: 'هل حفظك جيد، بلا خطأ ولا تردد؟', clips: ['ask'] };
export const RETRY = { text: 'أعدها خمس مرات.', clips: ['retry'] };
export const DONE = { text: 'أتممت ورد اليوم.', clips: ['done'] };
