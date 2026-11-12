// ─── رئيسية قسم الحفظ: أذكاري، مسبحتي، آية التفسير ───
// دوال صرفة: (الحالة، الحدث) ← حالة جديدة. القوائم يعدّلها صاحبها؛ العدّ يُصفَّر كل يوم.
// تُحفظ تحت HIFZ_HOME_KEY وتُزامَن مع الحساب (SYNCED_LOCAL_KEYS).

export const HIFZ_HOME_KEY = 'quran-fives-hifz-home-v1';
export const TARGET_MAX = 1000;
export const TEXT_MAX = 200;

// قائمة مقترحة، يحذف منها ويزيد عليها
export const DEFAULT_AZKAR = [
  { id: 'a1', text: 'سبحان الله وبحمده', target: 100 },
  { id: 'a2', text: 'أستغفر الله وأتوب إليه', target: 100 },
  { id: 'a3', text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير', target: 10 },
  { id: 'a4', text: 'اللهم صلِّ وسلِّم على نبينا محمد', target: 10 },
];

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
  const counts = {};
  if (source.azkarCounts && typeof source.azkarCounts === 'object') {
    for (const [id, n] of Object.entries(source.azkarCounts)) if (count(n)) counts[id] = n;
  }
  return {
    azkar: cleanList(source.azkar, DEFAULT_AZKAR),
    azkarDay: typeof source.azkarDay === 'string' ? source.azkarDay : null,
    azkarCounts: counts,
    tasbeeh,
    tasbeehActive: tasbeeh.some((z) => z.id === source.tasbeehActive) ? source.tasbeehActive : tasbeeh[0]?.id ?? null,
    tasbeehCount: count(source.tasbeehCount),
    tasbeehDay: typeof source.tasbeehDay === 'string' ? source.tasbeehDay : null,
    tasbeehRounds: count(source.tasbeehRounds),
    tafseer: cleanRef(source.tafseer),
  };
}

// يوم جديد: عدّ الأذكار ودورات المسبحة تبدأ من صفر (عدّ المسبحة الجاري يبقى)
export function rollHome(state, day) {
  let next = state;
  if (state.azkarDay !== day) next = { ...next, azkarDay: day, azkarCounts: {} };
  if (state.tasbeehDay !== day) next = { ...next, tasbeehDay: day, tasbeehRounds: 0 };
  return next;
}

// ─── أذكاري ───
export const zikrCount = (state, day, id) => (state.azkarDay === day ? state.azkarCounts[id] || 0 : 0);

export function azkarSummary(state, day) {
  const done = state.azkar.filter((z) => zikrCount(state, day, z.id) >= z.target).length;
  return { done, total: state.azkar.length };
}

// ضغطة على ذكر: واحدة إلى هدفه؛ ضغطة بعد تمامه تعيده إلى صفر
export function tapZikr(state, day, id) {
  const rolled = rollHome(state, day);
  const zikr = rolled.azkar.find((z) => z.id === id);
  if (!zikr) return rolled;
  const current = rolled.azkarCounts[id] || 0;
  return { ...rolled, azkarCounts: { ...rolled.azkarCounts, [id]: current >= zikr.target ? 0 : current + 1 } };
}

const newItem = (id, text, target) => {
  const trimmed = typeof text === 'string' ? text.trim().slice(0, TEXT_MAX) : '';
  return trimmed && validTarget(target) && id ? { id, text: trimmed, target } : null;
};

export function addZikr(state, id, text, target) {
  const item = newItem(id, text, target);
  return item ? { ...state, azkar: [...state.azkar, item] } : state;
}

export function removeZikr(state, id) {
  const azkarCounts = { ...state.azkarCounts };
  delete azkarCounts[id];
  return { ...state, azkar: state.azkar.filter((z) => z.id !== id), azkarCounts };
}

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

// ─── آية التفسير ─── null = آية اليوم
export const setTafseerVerse = (state, ref) => ({ ...state, tafseer: cleanRef(ref) });
