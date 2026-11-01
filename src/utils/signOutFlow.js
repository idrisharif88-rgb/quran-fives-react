// ─── تسلسل تسجيل الخروج: دالّة نقيّة بلا آثار جانبية ───
// idle ← confirm ← saving ← (wiping | failed ← confirmDelete ← wiping)
// لا طريق إلى wiping إلا بعد حفظ مؤكَّد (saved) أو قرار صريح (wipe).

export const IDLE = { step: 'idle' };

export const FAILURE = {
  OFFLINE: 'offline',             // لا اتصال بالإنترنت
  UNREACHABLE: 'unreachable',     // الاتصال موجود والخادم لا يجيب
  CONFLICT: 'conflict',           // 409: جهاز آخر كتب بعد هذا الجهاز
  EXPIRED: 'expired',             // 401: لا رفع ممكن، ولا مسح أيضاً
  NO_DESTINATION: 'noDestination', // حساب بانتظار الموافقة بلا جوجل درايف مربوط
};

export function signOutReducer(state, action) {
  switch (action.type) {
    case 'open':
      return state.step === 'idle' ? { step: 'confirm', switching: Boolean(action.switching) } : state;
    case 'start':
      return state.step === 'confirm' || state.step === 'failed'
        ? { step: 'saving', switching: state.switching }
        : state;
    case 'saved':
      return state.step === 'saving' ? { step: 'wiping', switching: state.switching } : state;
    case 'fail':
      return state.step === 'saving' ? { step: 'failed', switching: state.switching, failure: action.failure } : state;
    case 'askDelete':
      return state.step === 'failed' ? { ...state, step: 'confirmDelete', losses: action.losses } : state;
    case 'wipe':   // قرار صريح بعد تأكيد: «احذف واخرج»، أو إبقاء نسخة السحابة، أو انتهاء الجلسة
      return state.step === 'confirmDelete' || state.step === 'failed'
        ? { step: 'wiping', switching: state.switching }
        : state;
    case 'back':
      if (state.step === 'wiping') return state;   // بدأ المسح: لا رجعة
      if (state.step === 'confirmDelete') return { ...state, step: 'failed' };
      return IDLE;
    default:
      return state;
  }
}

/** خطأ طلب ← نوع الفشل الذي يراه المستخدم */
export function classifyFailure(error, online = navigator.onLine !== false) {
  if (error?.status === 409) return { kind: FAILURE.CONFLICT };
  if (error?.status === 401) return { kind: FAILURE.EXPIRED };
  if (error?.status === 403) return { kind: FAILURE.NO_DESTINATION };
  return { kind: online ? FAILURE.UNREACHABLE : FAILURE.OFFLINE };
}

const countOf = (v) => (Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0);

/** ما سيضيع من هذا الهاتف إن خرج دون حفظ: سطور للعرض، من بياناته الفعلية */
export function lossSummary(snapshot) {
  if (!snapshot) return [];
  const lines = [];
  const counter = (snapshot.nightCounters || []).find((c) => c.value);
  if (counter) lines.push(`العدّاد عند صفحة ${counter.value}`);
  if (snapshot.hifz) lines.push('برنامج الحفظ وتقدّمك فيه');
  const sessions = countOf(snapshot.sessions);
  if (sessions) lines.push(`بطاقات الأجزاء: ${sessions}`);
  const stars = Object.values(snapshot.starredByStep || {}).reduce((sum, list) => sum + countOf(list), 0)
    + countOf(snapshot.starredPages) + countOf(snapshot.starredPageEnds);
  if (stars) lines.push(`المثبّتات: ${stars}`);
  const notes = countOf(snapshot.verseNotes) + countOf(snapshot.quranicWondersNotes);
  if (notes) lines.push(`الملاحظات: ${notes}`);
  const ijazat = countOf(snapshot.ijazat);
  if (ijazat) lines.push(`الإجازات: ${ijazat}`);
  lines.push('وبقية إعداداتك وتقدّمك في الاختبارات');
  return lines;
}
