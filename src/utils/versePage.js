import { PAGE_STARTS } from '../data/pageStarts';

// صفحة المصحف التي تقع فيها الآية: آخر صفحة تبدأ عند هذه الآية أو قبلها
export function pageOfVerse(surah, ayah) {
  let page = 1;
  for (const start of PAGE_STARTS) {
    if (start.s < surah || (start.s === surah && start.a <= ayah)) page = start.page;
    else break;
  }
  return page;
}
