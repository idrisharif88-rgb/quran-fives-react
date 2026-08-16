#!/usr/bin/env bash
# ينزّل خطوط جوجل ويولّد fonts.css محلياً كي تعمل بلا إنترنت
set -euo pipefail

OUT_DIR="$1"        # src/assets/fonts
CSS_OUT="$2"        # src/styles/fonts.css
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

mkdir -p "$OUT_DIR"
TMP=$(mktemp -d)

# family|weights|slug
FAMILIES=(
  "Tajawal|400;500;700;800;900|tajawal"
  "Amiri|400;700|amiri"
  "Amiri Quran|400|amiri-quran"
  "Noto Naskh Arabic|400;700|noto-naskh-arabic"
  "Scheherazade New|400;700|scheherazade-new"
)

: > "$TMP/all.css"

for entry in "${FAMILIES[@]}"; do
  IFS='|' read -r family weights slug <<< "$entry"
  q=$(printf '%s' "$family" | sed 's/ /+/g')
  url="https://fonts.googleapis.com/css2?family=${q}:wght@${weights}&display=swap"
  echo ">> $family"
  curl -sS -A "$UA" "$url" >> "$TMP/all.css"
  echo "" >> "$TMP/all.css"
done

python3 - "$TMP/all.css" "$OUT_DIR" "$CSS_OUT" <<'PY'
import re, sys, os, urllib.request

src_css, out_dir, css_out = sys.argv[1], sys.argv[2], sys.argv[3]
css = open(src_css, encoding='utf-8').read()

KEEP = {'arabic', 'latin'}          # التطبيق عربي بأرقام لاتينية؛ بقية النطاقات لا داعي لها
SLUG = {
    'Tajawal': 'tajawal', 'Amiri': 'amiri', 'Amiri Quran': 'amiri-quran',
    'Noto Naskh Arabic': 'noto-naskh-arabic', 'Scheherazade New': 'scheherazade-new',
}

# جوجل يسبق كل كتلة بتعليق يحمل اسم النطاق الفرعي: /* arabic */
blocks = re.findall(r'/\*\s*([a-z\-]+)\s*\*/\s*(@font-face\s*\{.*?\})', css, re.S)
out, seen = [], set()

for subset, block in blocks:
    if subset not in KEEP:
        continue
    family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
    weight = re.search(r'font-weight:\s*(\d+)', block).group(1)
    url    = re.search(r'url\((https://[^)]+\.woff2)\)', block).group(1)
    rng    = re.search(r'unicode-range:\s*([^;]+);', block).group(1).strip()

    name = f"{SLUG[family]}-{weight}-{subset}.woff2"
    if name in seen:
        continue
    seen.add(name)

    path = os.path.join(out_dir, name)
    if not os.path.exists(path):
        with urllib.request.urlopen(url) as r, open(path, 'wb') as f:
            f.write(r.read())
    print(f"  {name}  {os.path.getsize(path)//1024} KB")

    out.append(
        "@font-face {\n"
        f"  font-family: '{family}';\n"
        "  font-style: normal;\n"
        f"  font-weight: {weight};\n"
        "  font-display: swap;\n"
        f"  src: url('../assets/fonts/{name}') format('woff2');\n"
        f"  unicode-range: {rng};\n"
        "}\n"
    )

header = """/* خطوط محلية — لا تعتمد على الإنترنت.
   كان src/App.css يبدأ بـ@import من fonts.googleapis.com، وهو طلب شبكة يفشل
   في APK بلا اتصال فترتدّ الخطوط كلّها إلى خطّ النظام (وأظهرها تجوال، لأنه
   الخطّ الافتراضي للواجهة). الملفّات الآن داخل الحزمة نفسها.

   النطاقات المحفوظة: arabic + latin فقط (الأرقام والمحارف اللاتينية).
   وُلّد بـ scripts/fetch-fonts.sh — لا يُحرّر يدوياً. */

"""
with open(css_out, 'w', encoding='utf-8') as f:
    f.write(header + "\n".join(out))
print(f"\nwrote {css_out}  ({len(out)} @font-face rules)")
PY
