// تجميع أسطر سجلّ الأخطاء للعرض: الخطأ نفسه (النوع + الرسالة) صفّ واحد، وتحته كل جهاز وقع فيه.
// الجهاز = معرّف التثبيت (installId): جهاز واحد قد يدخل بحسابين، وحساب واحد قد يكون على أجهزة عدّة.

const NO_ID = 'unknown';

/** اسم الجهاز للعرض: «samsung SM-N960F · Android 10»، أو المتصفح، أو آخر حروف المعرّف */
export function deviceName(d) {
  const label = [d.model, d.os].filter(Boolean).join(' · ');
  if (label) return label;
  if (d.platform === 'web') return 'الموقع';
  return d.installId && d.installId !== NO_ID ? `جهاز ${d.installId.slice(-4)}` : 'جهاز غير معروف';
}

function addTo(map, e) {
  const id = e.installId || NO_ID;
  let d = map.get(id);
  if (!d) {
    d = { installId: id, model: e.model, os: e.os, platform: e.platform, users: new Set(), versions: new Set(), count: 0, last: 0, errors: new Set() };
    map.set(id, d);
  }
  d.count += e.count || 1;
  if (e.at > d.last) { d.last = e.at; d.model = e.model || d.model; d.os = e.os || d.os; d.platform = e.platform || d.platform; }
  if (e.user) d.users.add(e.user);
  if (e.version) d.versions.add(e.version);
  d.errors.add(`${e.kind}|${e.message}`);
  return d;
}

const byLast = (a, b) => b.last - a.last;

/** كل جهاز أرسل أخطاء، الأحدث أولاً — لقائمة التصفية */
export function devicesOf(entries) {
  const map = new Map();
  entries.forEach((e) => addTo(map, e));
  return [...map.values()].sort(byLast);
}

export function groupErrors(entries) {
  const groups = new Map();
  for (const e of entries) {
    const key = `${e.kind}|${e.message}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, kind: e.kind, message: e.message, count: 0, last: 0, first: Infinity, devices: new Map(), sample: e };
      groups.set(key, g);
    }
    g.count += e.count || 1;
    if (e.at > g.last) { g.last = e.at; g.sample = e; }
    g.first = Math.min(g.first, e.at);
    addTo(g.devices, e);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, devices: [...g.devices.values()].sort(byLast) }))
    .sort(byLast);
}
