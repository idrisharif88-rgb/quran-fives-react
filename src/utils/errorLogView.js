// تجميع أسطر سجلّ الأخطاء للعرض: الخطأ نفسه (النوع + الرسالة) صفّ واحد بعدده وأجهزته وآخر وقت.
export function groupErrors(entries) {
  const groups = new Map();
  for (const e of entries) {
    const key = `${e.kind}|${e.message}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, kind: e.kind, message: e.message, count: 0, last: 0, first: Infinity, installs: new Set(), users: new Set(), versions: new Set(), platforms: new Set(), sample: e };
      groups.set(key, g);
    }
    g.count += e.count || 1;
    if (e.at > g.last) { g.last = e.at; g.sample = e; }
    g.first = Math.min(g.first, e.at);
    if (e.installId) g.installs.add(e.installId);
    if (e.user) g.users.add(e.user);
    if (e.version) g.versions.add(e.version);
    if (e.platform) g.platforms.add(e.platform);
  }
  return [...groups.values()].sort((a, b) => b.last - a.last);
}
