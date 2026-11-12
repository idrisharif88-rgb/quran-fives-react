#!/bin/sh
# تنزيل كتب المكتبة من OpenITI وبناء القاعدة — يعمل على السيرفر مباشرة.
# الاستعمال (من /opt/quran-sync):  sh library/fetch-books.sh
# لإضافة كتاب: سطر جديد في BOOKS بصيغة  مستودع/مسار-الملف-داخل-data
set -e
cd "$(dirname "$0")/.."
OUT=data/library
mkdir -p "$OUT/src"
B=https://raw.githubusercontent.com/OpenITI

BOOKS="
0350AH/0329IbnYacqubKulayni/0329IbnYacqubKulayni.Kafi/0329IbnYacqubKulayni.Kafi.Shia001122Vols-ara1.mARkdown
0275AH/0260ImamCaskari/0260ImamCaskari.Tafsir/0260ImamCaskari.Tafsir.Shia002334-ara1
0425AH/0406SharifRadi/0406SharifRadi.NahjBalagha/0406SharifRadi.NahjBalagha.Shia20200618-ara1.mARkdown
"

FILES=""
for b in $BOOKS; do
  repo=${b%%/*}
  rest=${b#*/}
  name=$(basename "$rest" .mARkdown)
  echo "⬇ $name"
  curl -fsSL "$B/$repo/master/data/$rest" -o "$OUT/src/$name.mARkdown"
  curl -fsSL "$B/$repo/master/data/${rest%.mARkdown}.yml" -o "$OUT/src/$name.yml" || true
  FILES="$FILES $OUT/src/$name.mARkdown"
done

rm -f "$OUT/library.new.db"
node --no-warnings library/build.js "$OUT/library.new.db" $FILES
mv "$OUT/library.new.db" "$OUT/library.db"
echo "✅ $(du -h "$OUT/library.db" | cut -f1) — أعد التشغيل: pm2 restart quran-sync"
