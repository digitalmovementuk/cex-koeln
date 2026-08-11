#!/usr/bin/env bash
# =============================================================================
# CEx — rebuild the share cards from scripts/og-image-source.html
# -----------------------------------------------------------------------------
# Produces, from the hero film's own still:
#   media/cex-og-1200x630.jpg        og:image / twitter:image  (1.91:1)
#   media/cex-thumbnail-1200x1200.jpg  square thumbnail        (1:1)
#
# Both are rendered at 2x in headless Chrome and downsampled with Lanczos —
# rendering straight at 1200 wide leaves the uppercase Inter visibly soft, and
# a share card is judged at thumbnail size where soft type reads as blur.
#
# The plate, media/cex-hero-still.jpg, is a frame of
# media/cx-hero-background-calm.mp4. To pick a different frame, open the film,
# export a still at 1600x900 and overwrite that file — nothing else changes.
#
# Requires: Google Chrome, python3 with Pillow. Run from the repo root:
#   bash scripts/render-share-cards.sh
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8899
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"; kill %1 2>/dev/null || true' EXIT

# The page loads local fonts and images, so it has to come off a real origin;
# file:// blocks the woff2 and the type silently falls back to system sans.
( cd "$ROOT" && python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 ) &
sleep 1

shot () { # shot <card> <width> <height>
  local card=$1 w=$2 h=$3
  "$CHROME" --headless=new --disable-gpu --no-first-run --hide-scrollbars \
    --force-device-scale-factor=2 --user-data-dir="$TMP/profile" \
    --virtual-time-budget=5000 --window-size="$w,$h" \
    --screenshot="$TMP/$card.png" \
    "http://127.0.0.1:$PORT/scripts/og-image-source.html?card=$card" >/dev/null 2>&1 &
  local i; for i in $(seq 1 30); do [ -s "$TMP/$card.png" ] && break; sleep 1; done
  sleep 1; pkill -f "Google Chrome --headless" 2>/dev/null || true
}

shot og    1200 630
shot thumb 1200 1200

python3 - "$TMP" "$ROOT" <<'PY'
import sys
from PIL import Image
tmp, root = sys.argv[1], sys.argv[2]
for name, out, size in [
    ("og",    "cex-og-1200x630.jpg",       (1200, 630)),
    ("thumb", "cex-thumbnail-1200x1200.jpg", (1200, 1200)),
]:
    im = Image.open(f"{tmp}/{name}.png").convert("RGB").resize(size, Image.LANCZOS)
    im.save(f"{root}/media/{out}", quality=86, optimize=True, progressive=True)
    print(out, im.size)
PY
