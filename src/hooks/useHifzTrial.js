import { useEffect, useState, useCallback } from 'react';
import useHifz from './useHifz';
import { loadStoredState, saveStoredState } from '../utils/persistence';

// برنامج التجربة على هذا الجهاز وحده — لا يدخل حالة التطبيق المُزامَنة
export const HIFZ_TRIAL_KEY = 'quran-fives-hifz-trial-v1';

/**
 * وضع التجربة للمشرف: برنامج حفظ منفصل بالقواعد نفسها، يُجرَّب ويُعاد كما يشاء،
 * والبرنامج الحقيقي لا يُمسّ. «إنهاء التجربة» يمحو برنامج التجربة.
 * @returns on, hifz (ما يعيده useHifz لبرنامج التجربة), start, end
 */
export default function useHifzTrial() {
  const [stored] = useState(() => loadStoredState(HIFZ_TRIAL_KEY) || {});
  const [on, setOn] = useState(Boolean(stored.on));
  const hifz = useHifz(stored.program);
  const { program, actions } = hifz;

  useEffect(() => {
    saveStoredState(HIFZ_TRIAL_KEY, { on, program });
  }, [on, program]);

  const start = useCallback(() => setOn(true), []);
  const end = useCallback(() => { actions.reset(); setOn(false); }, [actions]);

  return { on, hifz, start, end };
}
