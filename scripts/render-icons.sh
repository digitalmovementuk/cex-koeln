#!/usr/bin/env bash
# =============================================================================
# CEx — rebuild the full favicon set from favicon.svg
# -----------------------------------------------------------------------------
# Produces:
#   media/cex-favicon-16.png    browser tab
#   media/cex-favicon-32.png    browser tab, 2x
#   media/cex-favicon-48.png    Google's own favicon slot in search results
#   media/cex-apple-touch.png   180, iOS home screen
#   media/cex-favicon-192.png   Android / manifest
#   media/cex-favicon-512.png   Android / manifest, splash
#   favicon.ico                 16+32+48, for anything that still asks for it
#
# The mark itself is favicon.svg — the production CEx mark, unchanged. It is
# shot once at 512 in headless Chrome and every size is a Lanczos downsample of
# that single render, so the small sizes stay the same drawing rather than a
# separately-rasterised one that drifts a pixel.
#
# Requires: Google Chrome, python3 with Pillow. Run from the site root:
#   bash scripts/render-icons.sh
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8901
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"; kill %1 2>/dev/null || true' EXIT

( cd "$ROOT" && python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 ) &
sleep 1

# The SVG is 64x64; --force-device-scale-factor=8 renders it at 512 with the
# type still vector-sharp. A transparent backdrop is not wanted — the mark has
# its own charcoal plate and a tab strip should not show through it.
cat > "$TMP/icon.html" <<'HTML'
<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;width:64px;height:64px;overflow:hidden}
img{display:block;width:64px;height:64px}</style>
<img src="/favicon.svg" alt="">
HTML
cp "$TMP/icon.html" "$ROOT/_icon-shot.html"
trap 'rm -rf "$TMP" "$ROOT/_icon-shot.html"; kill %1 2>/dev/null || true' EXIT

# Chrome goes to the background and the file is polled for. Run in the
# foreground it can sit there after writing the screenshot and never return,
# which is what render-share-cards.sh already works around the same way.
"$CHROME" --headless=new --disable-gpu --no-first-run --hide-scrollbars \
  --force-device-scale-factor=8 --user-data-dir="$TMP/profile" \
  --virtual-time-budget=4000 --window-size=64,64 \
  --screenshot="$TMP/icon.png" \
  "http://127.0.0.1:$PORT/_icon-shot.html" >/dev/null 2>&1 &

for i in $(seq 1 25); do [ -s "$TMP/icon.png" ] && break; sleep 1; done
sleep 1
pkill -f "Google Chrome --headless" 2>/dev/null || true

python3 - "$TMP/icon.png" "$ROOT" <<'PY'
import sys
from PIL import Image

src, root = sys.argv[1], sys.argv[2]
master = Image.open(src).convert("RGBA")
if master.size != (512, 512):
    master = master.resize((512, 512), Image.LANCZOS)

for size, out in [
    (16,  "media/cex-favicon-16.png"),
    (32,  "media/cex-favicon-32.png"),
    (48,  "media/cex-favicon-48.png"),
    (180, "media/cex-apple-touch.png"),
    (192, "media/cex-favicon-192.png"),
    (512, "media/cex-favicon-512.png"),
]:
    master.resize((size, size), Image.LANCZOS).save(f"{root}/{out}", optimize=True)
    print(out, f"{size}x{size}")

master.save(f"{root}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("favicon.ico 16+32+48")
PY
