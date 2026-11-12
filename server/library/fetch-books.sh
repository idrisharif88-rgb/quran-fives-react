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
0100AH/0085SulaymIbnQaysHilali/0085SulaymIbnQaysHilali.KitabSulaym/0085SulaymIbnQaysHilali.KitabSulaym.Shia001265-ara1
0400AH/0381IbnBabawayhSaduq/0381IbnBabawayhSaduq.CuyunAkhbarRida/0381IbnBabawayhSaduq.CuyunAkhbarRida.Shia001142Vols-ara1.completed
0325AH/0320IbnMascudCayyashi/0320IbnMascudCayyashi.Tafsir/0320IbnMascudCayyashi.Tafsir.Shia002335Vols-ara1
0350AH/0329IbnIbrahimQummi/0329IbnIbrahimQummi.Tafsir/0329IbnIbrahimQummi.Tafsir.Shia002337Vols-ara1
0400AH/0381IbnBabawayhSaduq/0381IbnBabawayhSaduq.ManLaYahduruhuFaqih/0381IbnBabawayhSaduq.ManLaYahduruhuFaqih.Shia001149Vols-ara1.mARkdown
0475AH/0460ShaykhTusi/0460ShaykhTusi.TahdhibAhkam/0460ShaykhTusi.TahdhibAhkam.Shia001161Vols-ara1.completed
0475AH/0460ShaykhTusi/0460ShaykhTusi.Istibsar/0460ShaykhTusi.Istibsar.Shia001157Vols-ara1.completed
0550AH/0548IbnHasanTabarsi/0548IbnHasanTabarsi.TafsirMajmacBayan/0548IbnHasanTabarsi.TafsirMajmacBayan.Shia002359Vols-ara1
1125AH/1112IbnJumcaHuwayzi/1112IbnJumcaHuwayzi.TafsirNurThaqalayn/1112IbnJumcaHuwayzi.TafsirNurThaqalayn.Shia002389Vols-ara1
0800AH/0786ShahidAwwal/0786ShahidAwwal.SahifaSajjadiyya/0786ShahidAwwal.SahifaSajjadiyya.Shia001112-ara1.completed
0300AH/0290IbnHasanSaffar/0290IbnHasanSaffar.BasairDarajat/0290IbnHasanSaffar.BasairDarajat.Shia001117-ara1
0275AH/0274AhmadBarqi/0274AhmadBarqi.Mahasin/0274AhmadBarqi.Mahasin.Shia001115Vols-ara1
0400AH/0400IbnCaliHarrani/0400IbnCaliHarrani.TuhafCuqul/0400IbnCaliHarrani.TuhafCuqul.Shia001153-ara1
0400AH/0381IbnBabawayhSaduq/0381IbnBabawayhSaduq.KamalDin/0381IbnBabawayhSaduq.KamalDin.Shia001146-ara1.completed
0475AH/0460ShaykhTusi/0460ShaykhTusi.Ghayba/0460ShaykhTusi.Ghayba.Shia001335-ara1
0425AH/0401IbnAyyashJawhari/0401IbnAyyashJawhari.MuqtadabAthar/0401IbnAyyashJawhari.MuqtadabAthar.Shia001289-ara1
0825AH/0803BahaDinNiliNajafi/0803BahaDinNiliNajafi.MuntakhabAnwar/0803BahaDinNiliNajafi.MuntakhabAnwar.Shia004022-ara1
"

FILES=""
for b in $BOOKS; do
  repo=${b%%/*}
  rest=${b#*/}
  name=$(basename "$rest" .mARkdown)
  meta=${rest%.mARkdown}
  meta=${meta%.completed}
  echo "⬇ $name"
  curl -fsSL "$B/$repo/master/data/$rest" -o "$OUT/src/$name.mARkdown"
  curl -fsSL "$B/$repo/master/data/$meta.yml" -o "$OUT/src/${name%.completed}.yml" || true
  FILES="$FILES $OUT/src/$name.mARkdown"
done

# كتب محلية ليست في OpenITI (محوّلة من Word، لا تُحفظ في git)
for f in "$OUT"/local/*.mARkdown; do [ -e "$f" ] && FILES="$FILES $f"; done

rm -f "$OUT/library.new.db"
node --no-warnings library/build.js "$OUT/library.new.db" $FILES
mv "$OUT/library.new.db" "$OUT/library.db"
echo "✅ $(du -h "$OUT/library.db" | cut -f1) — أعد التشغيل: pm2 restart quran-sync"
