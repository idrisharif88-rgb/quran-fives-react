import { QURAN_VERSES } from '../data/quranVerses';

const CACHE_NAME = 'quran-audio-cache';

export const getAudioUrl = (surah, ayah, reciterId) => {
  const paddedSurah = surah.toString().padStart(3, '0');
  const paddedAyah = ayah.toString().padStart(3, '0');
  return `https://everyayah.com/data/${reciterId}/${paddedSurah}${paddedAyah}.mp3`;
};

// تحميل سورة معينة وتتبع التقدم
export const downloadSurah = async (surahNumber, reciterId, onProgress) => {
  if (!('caches' in window)) {
    throw new Error('التقنية غير مدعومة في متصفحك');
  }

  const surahVerses = QURAN_VERSES.filter(v => v.s === surahNumber);
  const total = surahVerses.length;
  let downloaded = 0;

  const cache = await caches.open(CACHE_NAME);

  // نستخدم معالجة متزامنة جزئياً لتفادي التحميل المفرط على الشبكة (مثلاً 5 في نفس الوقت)
  const CONCURRENCY = 5;
  
  let hasErrors = false;

  for (let i = 0; i < total; i += CONCURRENCY) {
    const chunk = surahVerses.slice(i, i + CONCURRENCY);
    const promises = chunk.map(async (verse) => {
      const url = getAudioUrl(verse.s, verse.a, reciterId);
      const cachedResponse = await cache.match(url);
      
      if (!cachedResponse) {
        try {
          console.log(`Fetching ${url}`);
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response.clone());
          } else {
            console.error(`Error downloading ${url}: ${response.status} ${response.statusText}`);
            hasErrors = true;
          }
        } catch (err) {
          console.error(`Error fetching ${url}`, err);
          hasErrors = true;
        }
      }
      
      downloaded++;
      if (onProgress) {
        onProgress({ downloaded, total });
      }
    });

    await Promise.all(promises);
    // Add a small delay between chunks to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  if (hasErrors) {
    throw new Error('Some files failed to download. Please try again.');
  }

  return true;
};

// مسح جميع الصوتيات المحملة
export const clearAudioCache = async () => {
  if ('caches' in window) {
    await caches.delete(CACHE_NAME);
  }
};
