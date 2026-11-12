import { DEFAULT_TAFSEER_BOOK, isTafseerBook } from './tafseerApi';

// ─── رئيسية قسم الحفظ: مسبحتي، وآية التفسير وكتابه ───
// دوال صرفة: (الحالة، الحدث) ← حالة جديدة. القائمة يعدّلها صاحبها؛ دورات اليوم تُصفَّر كل يوم.
// تُحفظ تحت HIFZ_HOME_KEY وتُزامَن مع الحساب (SYNCED_LOCAL_KEYS).
// (أذكاري حُذفت بطلب المالك؛ ما خُزّن منها قبل ذلك يُهمَل عند القراءة.)

export const HIFZ_HOME_KEY = 'quran-fives-hifz-home-v1';
export const TARGET_MAX = 1000;
export const TEXT_MAX = 200;

export const DEFAULT_TASBEEH = [
  { id: 't1', text: 'سبحان الله', target: 33 },
  { id: 't2', text: 'الحمد لله', target: 33 },
  { id: 't3', text: 'الله أكبر', target: 34 },
];

const validTarget = (n) => Number.isInteger(n) && n >= 1 && n <= TARGET_MAX;

const cleanList = (raw, fallback) => {
  if (!Array.isArray(raw)) return fallback;
  return raw
    .filter((z) => z && typeof z.id === 'string' && typeof z.text === 'string' && z.text.trim() && validTarget(z.target))
    .map((z) => ({ id: z.id, text: z.text.trim().slice(0, TEXT_MAX), target: z.target }));
};

const cleanRef = (ref) => (
  ref && Number.isInteger(ref.s) && Number.isInteger(ref.a) && ref.s >= 1 && ref.s <= 114 && ref.a >= 1 ? { s: ref.s, a: ref.a } : null
);

const count = (n) => (Number.isInteger(n) && n > 0 ? n : 0);

// مخزَّن (أو لا شيء) ← حالة صالحة. قائمة أُفرغت تبقى فارغة؛ الغائبة تأخذ المقترحة.
export function normalizeHome(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const tasbeeh = cleanList(source.tasbeeh, DEFAULT_TASBEEH);
  return {
    tasbeeh,
    tasbeehActive: tasbeeh.some((z) => z.id === source.tasbeehActive) ? source.tasbeehActive : tasbeeh[0]?.id ?? null,
    tasbeehCount: count(source.tasbeehCount),
    tasbeehDay: typeof source.tasbeehDay === 'string' ? source.tasbeehDay : null,
    tasbeehRounds: count(source.tasbeehRounds),
    tafseer: cleanRef(source.tafseer),
    tafseerBook: isTafseerBook(source.tafseerBook) ? source.tafseerBook : DEFAULT_TAFSEER_BOOK,
  };
}

// يوم جديد: دورات المسبحة تبدأ من صفر (عدّها الجاري يبقى)
export function rollHome(state, day) {
  return state.tasbeehDay === day ? state : { ...state, tasbeehDay: day, tasbeehRounds: 0 };
}

const newItem = (id, text, target) => {
  const trimmed = typeof text === 'string' ? text.trim().slice(0, TEXT_MAX) : '';
  return trimmed && validTarget(target) && id ? { id, text: trimmed, target } : null;
};

// ─── مسبحتي ───
export const activeTasbeeh = (state) => state.tasbeeh.find((z) => z.id === state.tasbeehActive) ?? null;
export const tasbeehRounds = (state, day) => (state.tasbeehDay === day ? state.tasbeehRounds : 0);

// ضغطة: واحدة إلى الهدف (بلوغه دورة)، والضغطة بعده تبدأ دورة جديدة من واحد
export function tapTasbeeh(state, day) {
  const rolled = rollHome(state, day);
  const zikr = activeTasbeeh(rolled);
  if (!zikr) return rolled;
  if (rolled.tasbeehCount >= zikr.target) return { ...rolled, tasbeehCount: 1 };
  const tasbeehCount = rolled.tasbeehCount + 1;
  return { ...rolled, tasbeehCount, tasbeehRounds: rolled.tasbeehRounds + (tasbeehCount === zikr.target ? 1 : 0) };
}

export const zeroTasbeeh = (state) => ({ ...state, tasbeehCount: 0 });

// بعد إتمام الذكر: الذي يليه في القائمة (وبعد الأخير يعود إلى الأول) ويبدأ العدّ من صفر
export function nextTasbeeh(state) {
  if (state.tasbeeh.length === 0) return state;
  const at = state.tasbeeh.findIndex((z) => z.id === state.tasbeehActive);
  const next = state.tasbeeh[(at + 1) % state.tasbeeh.length];
  return { ...state, tasbeehActive: next.id, tasbeehCount: 0 };
}

export function pickTasbeeh(state, id) {
  if (id === state.tasbeehActive || !state.tasbeeh.some((z) => z.id === id)) return state;
  return { ...state, tasbeehActive: id, tasbeehCount: 0 };
}

export function addTasbeeh(state, id, text, target) {
  const item = newItem(id, text, target);
  return item ? { ...state, tasbeeh: [...state.tasbeeh, item], tasbeehActive: id, tasbeehCount: 0 } : state;
}

export function removeTasbeeh(state, id) {
  const tasbeeh = state.tasbeeh.filter((z) => z.id !== id);
  if (tasbeeh.length === state.tasbeeh.length) return state;
  if (state.tasbeehActive !== id) return { ...state, tasbeeh };
  return { ...state, tasbeeh, tasbeehActive: tasbeeh[0]?.id ?? null, tasbeehCount: 0 };
}

// ─── التفسير ─── الآية: null = آية اليوم. الكتاب من TAFSEER_BOOKS.
export const setTafseerVerse = (state, ref) => ({ ...state, tafseer: cleanRef(ref) });
export const setTafseerBook = (state, id) => (isTafseerBook(id) ? { ...state, tafseerBook: id } : state);
