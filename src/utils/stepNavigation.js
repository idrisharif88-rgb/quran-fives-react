// محرّك خطوات التنقّل: 1 (آية بعد آية)، 2، 3، 5 (الخماسيات)، 7.
// كل سورة تُسهم بـ floor(verseCount / step) مجموعة، والمجموعة رقم n تنتهي عند
// الآية n * step. الخطوة 5 هي السلوك التاريخي للتطبيق (1202 خماسية) وتبقى الافتراض.
import { SURAH_METADATA } from '../data/quranConstants.js';

export const STEP_SIZES = [1, 2, 3, 5, 7];
export const DEFAULT_STEP = 5;

// اسم المجموعة الواحدة بحسب الخطوة — يُستعمل في رسائل الخطأ وعناوين الواجهة
export const STEP_LABELS = {
  1: 'آية',
  2: 'ثنائية',
  3: 'ثلاثية',
  5: 'خماسية',
  7: 'سباعية',
};

export const isValidStep = (step) => STEP_SIZES.includes(step);

export const normalizeStep = (step) => (isValidStep(step) ? step : DEFAULT_STEP);

export const stepLabel = (step) => STEP_LABELS[normalizeStep(step)];

// جدول تراكمي لكل خطوة يُحسب مرّة واحدة ثمّ يُخزّن:
//   groups[i]      عدد مجموعات السورة i
//   groupOffset[i] عدد المجموعات في كل السور قبلها (بداية مدى السورة في الفهرس العالمي)
//   verseOffset[i] عدد الآيات في كل السور قبلها (الفهرس المطلق في QURAN_VERSES)
const tableCache = new Map();

export function buildStepTable(step) {
  const size = normalizeStep(step);
  const cached = tableCache.get(size);
  if (cached) return cached;

  const groups = new Array(114);
  const groupOffset = new Array(114);
  const verseOffset = new Array(114);
  let groupAcc = 0;
  let verseAcc = 0;

  for (let i = 0; i < 114; i++) {
    const { verseCount } = SURAH_METADATA[i];
    groupOffset[i] = groupAcc;
    verseOffset[i] = verseAcc;
    groups[i] = Math.floor(verseCount / size);
    groupAcc += groups[i];
    verseAcc += verseCount;
  }

  const table = { step: size, groups, groupOffset, verseOffset, total: groupAcc };
  tableCache.set(size, table);
  return table;
}

// إجمالي المجموعات: 1→6236، 2→3072، 3→2028، 5→1202، 7→855 (محسوبة لا مكتوبة)
export const totalGroups = (step) => buildStepTable(step).total;

// السورة التي يقع فيها الفهرس العالمي — بحث ثنائي على الجدول التراكمي
export function surahIndexForGroup(idx, step) {
  const { groups, groupOffset, total } = buildStepTable(step);
  if (!Number.isInteger(idx) || idx < 0 || idx >= total) return -1;

  let lo = 0;
  let hi = 113;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (idx < groupOffset[mid]) hi = mid - 1;
    else if (idx >= groupOffset[mid] + groups[mid]) lo = mid + 1;
    else return mid;
  }
  return -1;
}

// أوّل مجموعة في السورة (أوّل خماسية عند الخطوة 5).
// يعيد null للسور التي لا تتّسع لمجموعة واحدة عند هذه الخطوة (مثل الكوثر عند 7).
export function firstIndexOfSurah(surah, step) {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return null;
  const { groups, groupOffset } = buildStepTable(step);
  if (groups[surah - 1] === 0) return null;
  return groupOffset[surah - 1];
}

export const groupCountOfSurah = (surah, step) => (
  Number.isInteger(surah) && surah >= 1 && surah <= 114
    ? buildStepTable(step).groups[surah - 1]
    : 0
);

// فهرس المجموعة التي تحوي (سورة، آية) عند خطوة ما — أساس الحفاظ على موضع
// القراءة حين تتغيّر الخطوة. إن كانت السورة أصغر من أن تحوي مجموعة عند هذه
// الخطوة، ننتقل إلى أقرب سورة قبلها ثمّ بعدها تحوي واحدة.
export function indexForSurahAyah(surah, ayah, step) {
  const table = buildStepTable(step);
  const { groups, groupOffset, total } = table;
  if (total === 0) return 0;

  let i = Math.min(Math.max((surah || 1) - 1, 0), 113);

  if (groups[i] === 0) {
    let back = i - 1;
    while (back >= 0 && groups[back] === 0) back--;
    if (back >= 0) return groupOffset[back] + groups[back] - 1;
    let fwd = i + 1;
    while (fwd < 114 && groups[fwd] === 0) fwd++;
    return fwd < 114 ? groupOffset[fwd] : 0;
  }

  const wanted = Math.ceil(Math.max(ayah || 1, 1) / table.step);
  const groupNo = Math.min(Math.max(wanted, 1), groups[i]);
  return groupOffset[i] + groupNo - 1;
}
