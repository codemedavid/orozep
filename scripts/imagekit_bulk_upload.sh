#!/usr/bin/env bash
# One-time bulk upload of the Orozep product photoshoot to ImageKit.
# Usage: IK_PRIVATE_KEY='private_xxx:' bash scripts/imagekit_bulk_upload.sh
set -euo pipefail

IMG_DIR="public/orozep website product images"
OUT="scripts/imagekit_uploads.json"
PRIVATE="${IK_PRIVATE_KEY:?Set IK_PRIVATE_KEY env var (include trailing colon)}"

# filename -> slug (descriptive ImageKit fileName)
declare -a MAP=(
  "photo_2026-05-26 18.28.42.jpeg|bacteriostatic-water-10pack"
  "photo_2026-05-26 18.28.45.jpeg|fat-blaster-vial"
  "photo_2026-05-26 18.28.47.jpeg|kpv-10mg"
  "photo_2026-05-26 18.28.49.jpeg|retatrutide-30mg"
  "photo_2026-05-26 18.28.50.jpeg|ghk-cu-100mg"
  "photo_2026-05-26 18.29.22.jpeg|tirzepatide-15mg-10pack"
  "photo_2026-05-26 18.29.23.jpeg|hhb-blend"
  "photo_2026-05-26 18.29.25.jpeg|insulin-syringe-05ml"
  "photo_2026-05-26 18.29.26.jpeg|klow-80mg"
  "photo_2026-05-26 18.29.28.jpeg|ss-31-10mg"
  "photo_2026-05-26 18.29.29.jpeg|tirzepatide-60mg"
  "photo_2026-05-26 18.29.30.jpeg|tesamorelin-10mg"
  "photo_2026-05-26 18.29.32.jpeg|bacteriostatic-water-3ml"
  "photo_2026-05-26 18.29.33.jpeg|cagrilintide-5mg"
  "photo_2026-05-26 18.29.34.jpeg|tesamorelin-10mg-alt"
  "photo_2026-05-26 18.29.36.jpeg|glow-70mg"
  "photo_2026-05-26 18.29.37.jpeg|shine-syringe-3ml"
  "photo_2026-05-26 18.29.38.jpeg|tirzepatide-30mg-5pack"
  "photo_2026-05-26 18.29.40.jpeg|retatrutide-15mg"
  "photo_2026-05-26 18.29.42.jpeg|mots-c-10mg"
  "photo_2026-05-26 18.29.59.jpeg|ghk-cu-50mg"
  "photo_2026-05-26 18.30.00.jpeg|retatrutide-30mg-alt"
  "photo_2026-05-26 18.30.03.jpeg|tirzepatide-15mg"
  "photo_2026-05-26 18.30.04.jpeg|insulin-syringe-1ml-31g"
  "photo_2026-05-26 18.30.05.jpeg|tirzepatide-30mg"
  "photo_2026-05-26 18.30.06.jpeg|insulin-syringe-1ml-29g"
  "photo_2026-05-26 18.30.07.jpeg|tirzepatide-30mg-5pack-alt"
  "photo_2026-05-26 18.30.09.jpeg|tirzepatide-30mg-with-bac"
  "photo_2026-05-26 18.30.10.jpeg|tirzepatide-15mg-10pack-alt"
  "photo_2026-05-26 18.30.12.jpeg|glow-70mg-alt"
  "photo_2026-05-26 18.30.13.jpeg|aod-9604-5mg"
  "photo_2026-05-26 18.30.15.jpeg|glutathione-15g"
  "photo_2026-05-26 18.30.16.jpeg|aqualyx-box"
  "photo_2026-05-26 18.30.17.jpeg|nad-500mg"
)

echo "[" > "$OUT"
first=1
for entry in "${MAP[@]}"; do
  file="${entry%%|*}"
  slug="${entry##*|}"
  resp=$(curl -s -X POST "https://upload.imagekit.io/api/v1/files/upload" \
    -u "$PRIVATE" \
    -F "file=@${IMG_DIR}/${file}" \
    -F "fileName=${slug}.jpg" \
    -F "folder=/orozep-products" \
    -F "useUniqueFileName=true")
  url=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))" 2>/dev/null || echo "")
  fid=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('fileId',''))" 2>/dev/null || echo "")
  if [ -z "$url" ]; then
    echo "FAILED: $file -> $resp" >&2
    continue
  fi
  [ $first -eq 0 ] && echo "," >> "$OUT"
  first=0
  printf '  {"slug": "%s", "url": "%s", "fileId": "%s"}' "$slug" "$url" "$fid" >> "$OUT"
  echo "OK: $slug -> $url" >&2
done
echo "" >> "$OUT"
echo "]" >> "$OUT"
echo "Done. Wrote $OUT" >&2
