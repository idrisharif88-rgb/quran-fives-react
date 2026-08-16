import { SURAH_METADATA } from '../data/quranConstants.js';
import { buildStepTable, surahIndexForGroup, DEFAULT_STEP } from './stepNavigation.js';

/**
 * Calculates the Surah, name, start, and end verses for a given group index.
 *
 * @param {number} idx   Global group index (0-based).
 * @param {number} step  Verses per group: 1, 2, 3, 5 or 7. Defaults to 5, the
 *                       historical khmasiyat behaviour, so existing callers
 *                       (quizzes, starred lists) keep working unchanged.
 */
export function getSurahAndRange(idx, step = DEFAULT_STEP) {
    const table = buildStepTable(step);
    const i = surahIndexForGroup(idx, table.step);

    if (i === -1) {
        return { surah: 0, name: "غير معروف", start: 0, end: 0, groupNo: 0, totalGroups: 0, absoluteStartIndex: 0, absoluteEndIndex: 0 };
    }

    const surah = SURAH_METADATA[i];
    const groupNo = idx - table.groupOffset[i] + 1;   // ترتيب المجموعة داخل السورة
    const endInSurah = groupNo * table.step;
    const startInSurah = Math.max(1, endInSurah - table.step + 1);

    return {
        surah: surah.id,
        name: surah.name,
        start: startInSurah,
        end: endInSurah,
        groupNo,
        totalGroups: table.groups[i],
        absoluteStartIndex: table.verseOffset[i] + (startInSurah - 1),
        absoluteEndIndex: table.verseOffset[i] + endInSurah,
    };
}
