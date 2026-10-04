// محدِّد بنافذة ثابتة في الذاكرة: يكفي لخادم واحد، ويُصفَّر بإعادة التشغيل.
export function createLimiter({ windowMs, max }) {
  const hits = new Map(); // key -> { count, resetAt }

  function entry(key, now) {
    const e = hits.get(key);
    if (e && e.resetAt > now) return e;
    return null;
  }

  // هل تجاوز المفتاح الحدّ؟ (قراءة فقط)
  function blocked(key, now = Date.now()) {
    const e = entry(key, now);
    return Boolean(e && e.count >= max);
  }

  // يسجّل محاولة
  function hit(key, now = Date.now()) {
    const e = entry(key, now);
    if (e) { e.count += 1; return; }
    // تنظيف عند الامتلاء حتى لا تكبر الخريطة بلا حدّ
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    hits.set(key, { count: 1, resetAt: now + windowMs });
  }

  return { blocked, hit };
}
