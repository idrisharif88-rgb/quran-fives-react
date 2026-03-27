import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const endpoint = 'https://api.alquran.cloud/v1/quran/quran-uthmani';
const outFile = path.join(process.cwd(), 'src', 'data', 'pageStarts.js');

function buildOrderedPages(json) {
  if (json?.code !== 200 || !json?.data?.surahs) throw new Error('bad-response');

  const firstAyahByPage = new Map();
  for (const surah of json.data.surahs) {
    for (const ayah of surah.ayahs) {
      if (!firstAyahByPage.has(ayah.page)) {
        firstAyahByPage.set(ayah.page, {
          page: ayah.page,
          s: surah.number,
          a: ayah.numberInSurah,
          t: ayah.text,
        });
      }
    }
  }

  const ordered = [];
  for (let page = 1; page <= 604; page++) {
    const ayah = firstAyahByPage.get(page);
    if (ayah) ordered.push(ayah);
  }
  if (ordered.length !== 604) throw new Error(`missing-pages:${ordered.length}`);

  return ordered;
}

async function main() {
  const res = await fetch(endpoint);
  const json = await res.json();
  const ordered = buildOrderedPages(json);

  const body = `export const PAGE_STARTS = ${JSON.stringify(ordered, null, 2)};\n`;
  await writeFile(outFile, body, 'utf8');
  console.log(`Wrote ${ordered.length} pages to ${outFile}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

