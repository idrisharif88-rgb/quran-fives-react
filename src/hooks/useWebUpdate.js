import { useSyncExternalStore } from 'react';
import { getWebUpdate, subscribeWebUpdate, applyWebUpdate, dismissWebUpdate } from '../utils/webUpdate';

/** نسخة جديدة من الموقع جاهزة؟ (webUpdate.js) — في التطبيق لا شيء يتغيّر */
export default function useWebUpdate() {
  const { ready } = useSyncExternalStore(subscribeWebUpdate, getWebUpdate);
  return { ready, apply: applyWebUpdate, later: dismissWebUpdate };
}
