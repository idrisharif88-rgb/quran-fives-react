// ─── الموقع: نسخة جديدة جاهزة ───
// عامل الخدمة (vite-plugin-pwa، registerType: 'prompt') ينزّل النسخة الجديدة وينتظر. كانت لا تعمل إلا بعد
// إغلاق كل نوافذ الموقع، وأندرويد يُبقي بعضها حيّاً، فلا تصل. الآن تُعرض «نسخة جديدة — حدّث الآن» (WebUpdateBar)،
// والضغطة تفعّلها وتعيد التحميل. ويُسأل الخادم عن نسخة جديدة كلما عاد الزائر إلى الموقع.

let state = { ready: false };
let apply = null;
const listeners = new Set();

const set = (next) => { state = next; listeners.forEach((fn) => fn(state)); };

export const getWebUpdate = () => state;
export function subscribeWebUpdate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** يربط عامل الخدمة بهذه الحالة. registerSW من virtual:pwa-register يُمرَّر من webShell.js. */
export function startWebUpdates(registerSW) {
  apply = registerSW({
    onNeedRefresh: () => set({ ready: true }),
    onRegisteredSW: (url, registration) => {
      if (!registration) return;
      const check = () => { if (document.visibilityState === 'visible') registration.update().catch(() => {}); };
      document.addEventListener('visibilitychange', check);
      setInterval(check, 60 * 60 * 1000);   // ومرّة كل ساعة لمن يبقي الموقع مفتوحاً
    },
  });
}

/** يفعّل النسخة الجديدة ويعيد التحميل */
export const applyWebUpdate = () => apply?.(true);
export const dismissWebUpdate = () => set({ ready: false });
