/**
 * Pure evaluation function for RandomAyahQuiz answers.
 * Returns a result object so the component stays free of decision logic.
 *
 * رقم الآية وحده هو المطلوب. كان الاختبار يطلب رقم السورة أيضاً، فيُحسب
 * السؤال خطأً لمجرّد الخطأ في السورة وإن أصاب المستخدم رقم الآية.
 */
export function evaluateRandomAyahAnswer(verseGuessStr, verseData) {
  if (verseGuessStr === '') {
    return { valid: false, message: 'يرجى إدخال رقم الآية.', shakeVerse: true };
  }

  const guessedVerse = Number(verseGuessStr);
  if (!Number.isInteger(guessedVerse)) {
    return { valid: false, message: 'يرجى إدخال رقم الآية.', shakeVerse: true };
  }

  const correctVerse = verseData?.a ?? 0;

  if (guessedVerse === correctVerse) {
    return { valid: true, correct: true, message: 'إجابة صحيحة', shakeVerse: false };
  }

  return {
    valid: true,
    correct: false,
    message: `غير صحيح. رقم الآية: ${correctVerse}`,
    shakeVerse: true,
  };
}

export function getSecureRandomIntInclusive(min, max) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  const span = upper - lower + 1;
  if (span <= 0) return lower;

  if (window.crypto && window.crypto.getRandomValues) {
    const uint32Max = 0x100000000;
    const limit = uint32Max - (uint32Max % span);
    const randomBuffer = new Uint32Array(1);
    let randomValue = 0;
    do {
      window.crypto.getRandomValues(randomBuffer);
      randomValue = randomBuffer[0];
    } while (randomValue >= limit);
    return lower + (randomValue % span);
  }

  return lower + Math.floor(Math.random() * span);
}

export function buildShuffledIndices(start, end) {
  const indices = [];
  for (let n = start; n <= end; n++) {
    indices.push(n - 1);
  }
  for (let i = indices.length - 1; i > 0; i--) {
    const j = getSecureRandomIntInclusive(0, i);
    const temp = indices[i];
    indices[i] = indices[j];
    indices[j] = temp;
  }
  return indices;
}

// محطّات التهنئة أثناء اختبار طويل: كل 100 سؤال
export const QUIZ_MILESTONE = 100;

/**
 * ما يُعلَن عند طلب السؤال التالي، قبل تقديمه.
 * @param forced       دورة جديدة بطلب صاحبها (تطبيق المدى، «اختبار جديد»)
 * @param rangeChanged المدى تغيّر منذ بناء الترتيب
 * @param orderLength  عدد أسئلة الدورة
 * @param pointer      عدد ما قُدّم منها حتى الآن
 * @returns { kind: 'finished' } حين لا سؤال بعده — النتيجة تُعرض ولا تبدأ دورة وحدها،
 *          { kind: 'milestone' } عند كل محطّة، وإلا null
 */
export function quizNotice({ forced = false, rangeChanged = false, orderLength, pointer }) {
  if (forced || rangeChanged || orderLength === 0) return null;
  if (pointer >= orderLength) return { kind: 'finished', completed: orderLength, total: orderLength };
  if (pointer % QUIZ_MILESTONE === 0) return { kind: 'milestone', completed: pointer, total: orderLength };
  return null;
}
