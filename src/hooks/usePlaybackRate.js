import { useSyncExternalStore } from 'react';
import { PLAYBACK_RATE_STORAGE_KEY as KEY, saveStoredState } from '../utils/persistence';

// سرعات تشغيل التسجيلات، تدور بضغطة. الاختيار يُزامَن مع الحساب (SYNCED_LOCAL_KEYS)
export const PLAYBACK_RATES = [1, 1.25, 1.5, 2];

const readRate = () => {
  try {
    const saved = Number(localStorage.getItem(KEY));
    return PLAYBACK_RATES.includes(saved) ? saved : 1;
  } catch { return 1; }
};

// يضبط مشغّلاً على السرعة مع إبقاء طبقة الصوت طبيعية (لا يصير الصوت حادّاً عند التسريع)
export function applyRate(audio, rate) {
  if (!audio) return;
  audio.preservesPitch = true;
  audio.webkitPreservesPitch = true;
  audio.playbackRate = rate;
}

// سرعة واحدة لكل المشغّلات المفتوحة (شاشة الاستماع و«تسجيلاتي» معاً): تغييرها في أحدهما يظهر في الآخر
let current = readRate();
const listeners = new Set();
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };

function cycle() {
  current = PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(current) + 1) % PLAYBACK_RATES.length];
  saveStoredState(KEY, current);
  listeners.forEach((listener) => listener());
}

/**
 * سرعة تشغيل تسجيلات الحفظ: 1 ← 1.25 ← 1.5 ← 2 ← 1، محفوظة على الجهاز.
 * @returns rate, cycle()
 */
export default function usePlaybackRate() {
  const rate = useSyncExternalStore(subscribe, () => current);
  return { rate, cycle };
}
