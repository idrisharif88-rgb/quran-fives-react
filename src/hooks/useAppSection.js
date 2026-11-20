import { useCallback, useState } from 'react';
import { SECTION, loadSectionChoice, saveSectionChoice, sectionFor } from '../utils/appSection';

/** القسم المختار للحساب الحالي (أو للجهاز بلا حساب). needsChoice: لم يختر بعد. */
export default function useAppSection(account) {
  const user = account?.user ?? null;
  const [choice, setChoice] = useState(loadSectionChoice);
  const section = sectionFor(choice, user);

  const choose = useCallback((next) => setChoice(saveSectionChoice(user, next)), [user]);

  return {
    needsChoice: !section,
    isHifz: section === SECTION.HIFZ,
    choose,
  };
}
