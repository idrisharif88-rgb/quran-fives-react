// ذاكرة نتائج صغيرة (الأحدث استعمالاً). القاعدة للقراءة فقط ولا تتغيّر إلا بإعادة تشغيل الخادم بعد
// إعادة بنائها، فلا تصير النتيجة المحفوظة قديمة أبداً.
export function createLru(max = 300) {
  const map = new Map();
  return {
    get(key) {
      if (!map.has(key)) return undefined;
      const v = map.get(key);
      map.delete(key);
      map.set(key, v);
      return v;
    },
    set(key, v) {
      map.delete(key);
      map.set(key, v);
      if (map.size > max) map.delete(map.keys().next().value);
    },
    get size() { return map.size; },
  };
}
