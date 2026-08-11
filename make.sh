#!/usr/bin/env bash
# Rebuild the whole cex.koeln placeholder, in the one order that is correct:
# build.py copies the production media across (and would overwrite the icons),
# so the two render steps have to run after it, not before.
set -euo pipefail
cd "$(dirname "$0")"
python3 build.py
bash scripts/render-icons.sh
bash scripts/render-share-cards.sh
echo "done"
