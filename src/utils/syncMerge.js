// ─── دمج نسختين بلا سؤال (المزامنة التلقائية) ───
// دمج ثلاثي: الأساس (آخر نسخة اتّفق عليها الجهاز والخادم)، ونسخة الجهاز، ونسخة السحابة.
// - ما غيّره طرف واحد يُؤخذ منه.
// - الكائنات تُدمج مفتاحاً مفتاحاً (التفاسير، الدفتر داخل localStores، الصفحات المنقورة…).
// - القوائم التي لكل عنصر فيها id تُدمج بالـid: ما أُضيف في أيّ طرف يبقى، وما حُذف في طرف يُحذف.
// - قوائم النجوم مجموعات: الإضافات من الطرفين تبقى، والمحذوف في أيّ طرف يُحذف.
// - غير ذلك (رقم، نصّ، قائمة مرتّبة) إن غيّره الطرفان معاً: الأحدث يفوز.

const SET_PATHS = [
  /^starredByStep\.[^.]+$/, /^starredIndices$/, /^starredPages$/, /^starredPageEnds$/,
  /^localStores\.quran-fives-library-recent-v1$/,   // بحث المكتبة: ما حُذف في جهاز يُحذف، وما أُضيف في آخر يبقى
];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasIds = (arr) => Array.isArray(arr) && arr.length > 0 && arr.every((x) => isObj(x) && (typeof x.id === 'string' || typeof x.id === 'number'));

export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
}

const key = (x) => (typeof x === 'object' ? JSON.stringify(x) : `${typeof x}:${x}`);

function mergeSet(base = [], local = [], remote = []) {
  const b = new Set(base.map(key));
  const removed = new Set([...base.map(key)].filter((k) => !local.some((x) => key(x) === k) || !remote.some((x) => key(x) === k)));
  const out = [];
  const seen = new Set();
  for (const x of [...local, ...remote]) {
    const k = key(x);
    if (seen.has(k) || (b.has(k) && removed.has(k))) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function mergeById(base, local, remote, path, newer) {
  const byId = (arr) => new Map((Array.isArray(arr) ? arr : []).map((x) => [String(x.id), x]));
  const B = byId(base); const L = byId(local); const R = byId(remote);
  const ids = [];
  for (const x of [...local, ...remote]) { const id = String(x.id); if (!ids.includes(id)) ids.push(id); }
  const out = [];
  for (const id of ids) {
    const inB = B.has(id); const inL = L.has(id); const inR = R.has(id);
    if (inL && inR) { out.push(mergeValue(B.get(id), L.get(id), R.get(id), `${path}[]`, newer)); continue; }
    const only = inL ? L.get(id) : R.get(id);
    // حُذف في الطرف الآخر: يبقى محذوفاً إلا إن عُدّل بعد الأساس في هذا الطرف
    if (inB && deepEqual(B.get(id), only)) continue;
    out.push(only);
  }
  return out;
}

function mergeValue(base, local, remote, path, newer) {
  if (deepEqual(local, remote)) return local;
  if (base !== undefined && deepEqual(base, local)) return remote;
  if (base !== undefined && deepEqual(base, remote)) return local;
  if (isObj(local) && isObj(remote)) {
    const b = isObj(base) ? base : {};
    const out = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const sub = path ? `${path}.${k}` : k;
      const inL = k in local; const inR = k in remote;
      if (inL && inR) { out[k] = mergeValue(b[k], local[k], remote[k], sub, newer); continue; }
      const only = inL ? local[k] : remote[k];
      if (k in b && deepEqual(b[k], only)) continue;   // حذفه الطرف الآخر ولم يُعدَّل هنا
      out[k] = only;
    }
    return out;
  }
  if (Array.isArray(local) && Array.isArray(remote)) {
    if (SET_PATHS.some((re) => re.test(path))) return mergeSet(Array.isArray(base) ? base : [], local, remote);
    if ((hasIds(local) || local.length === 0) && (hasIds(remote) || remote.length === 0) && (local.length || remote.length)) {
      return mergeById(Array.isArray(base) ? base : [], local, remote, path, newer);
    }
  }
  return newer === 'local' ? local : remote;
}

/**
 * @param base   آخر نسخة متّفق عليها، أو null (جهاز لم يحفظ أساساً بعد: لا يُعرف المحذوف)
 * @param newer  'local' | 'remote': من يفوز حين يغيّر الطرفان القيمة نفسها
 */
export function mergeStates(base, local, remote, newer = 'remote') {
  return mergeValue(base ?? undefined, local, remote, '', newer);
}
