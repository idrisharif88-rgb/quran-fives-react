import { SURAH_METADATA } from '../data/quranConstants.js';

/**
 * Calculates the Surah, name, start, and end verses for a given Khmasiyat group index.
 */
export function getSurahAndRange(idx) {
    const verseEnd = (idx + 1) * 5;
    let acc = 0;
    let absoluteAcc = 0; // Tracks total verses including remainders
    
    for (let i = 0; i < 114; i++) {
        const surah = SURAH_METADATA[i];
        const usable = surah.verseCount - (surah.verseCount % 5);
        if (acc + usable >= verseEnd) {
            const before = acc;
            const endInSurah = verseEnd - before;
            const startInSurah = Math.max(1, endInSurah - 4);
            const groupNo = Math.ceil(endInSurah / 5);
            const totalGroups = Math.floor(surah.verseCount / 5);
            
            const absoluteStartIndex = absoluteAcc + (startInSurah - 1);
            const absoluteEndIndex = absoluteAcc + endInSurah;
            
            return {
                surah: surah.id, 
                name: surah.name, 
                start: startInSurah, 
                end: endInSurah, 
                groupNo, 
                totalGroups,
                absoluteStartIndex,
                absoluteEndIndex
            };
        }
        acc += usable;
        absoluteAcc += surah.verseCount;
    }
    return { surah: 0, name: "غير معروف", start: 0, end: 0, groupNo: 0, totalGroups: 0, absoluteStartIndex: 0, absoluteEndIndex: 0 };
}