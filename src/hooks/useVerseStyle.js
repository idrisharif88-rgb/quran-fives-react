import { useSyncExternalStore } from 'react';
import { VERSE_STYLE_STORAGE_KEY as KEY, saveStoredState } from '../utils/persistence';

// شكل بطاقة الآيات: 'text' النصّ بخطّ المستخدم (الافتراضي)، أو 'mushaf' أسطر المصحف المدني كما في الحفظ.
// يُزامَن مع الحساب (SYNCED_LOCAL_KEYS) ويدخل نسخة جوجل درايف.
export const VERSE_STYLES = ['text', 'mushaf'];

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return VERSE_STYLES.includes(saved) ? saved : 'text';
  } catch { return 'text'; }
};

// قيمة واحدة لكل البطاقات المعروضة؛ تُعاد قراءتها بعد تنزيل نسخة السحابة (إعادة تحميل)
let current = read();
const listeners = new Set();
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };

function setStyle(next) {
  if (!VERSE_STYLES.includes(next) || next === current) return;
  current = next;
  saveStoredState(KEY, current);
  listeners.forEach((listener) => listener());
}

export default function useVerseStyle() {
  const style = useSyncExternalStore(subscribe, () => current);
  return { style, setStyle, toggle: () => setStyle(current === 'text' ? 'mushaf' : 'text') };
}
