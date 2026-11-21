#!/usr/bin/env bash
set -euo pipefail
export JAVA_TOOL_OPTIONS="-Djava.awt.headless=true"
# All tests use public, already-repository-hosted avatar artwork.
# No image/audio upload, no microphone, no modification to production site.
MODE="${1:?Specify mesh, still, psd, kit, cubism}"
ROOT="${GITHUB_WORKSPACE:-$(pwd)}"
SOURCE="$ROOT/koe/art/singer-open.png"
OUT="${RUNNER_TEMP:-/tmp}/cymatic-rig-benchmark"
mkdir -p "$OUT"
test -s "$SOURCE" || { echo "::error::Avatar art not present"; exit 1; }
echo "MODE=$MODE"
echo "SOURCE_SHA=$(sha256sum "$SOURCE" | cut -d' ' -f1)"
fetch() {
  local target="$1" repo="$2" revision="$3"
  git clone -q --no-checkout "https://github.com/$repo.git" "$OUT/$target"
  git -C "$OUT/$target" checkout -q "$revision"
  echo "PINNED $repo $revision"
}
case "$MODE" in
mesh)
  fetch mesh shinshin86/mesh-avatar-studio 406714b8dafc7cdd02d0924c16f7ffed881dbdbe
  cd "$OUT/mesh"
  npm ci --ignore-scripts --no-audit --no-fund
  uv run tools/new-project.py "$SOURCE" cymatic-benchmark
  test -s projects/cymatic-benchmark/source.png
  test -s projects/cymatic-benchmark/rig.draft.json
  python - <<'PY'
import json
from pathlib import Path
p=Path('projects/cymatic-benchmark/rig.draft.json')
print('MESH PROJECT CREATED:', p, 'BYTES',len(p.read_bytes()))
print('RIG DRAFT KEYS:',list(json.loads(p.read_text()).keys()))
PY
  echo "PASS: single-image project created; not a finished mesh rig"
  ;;
still)
  fetch still shinshin86/still2rig-psd b5c1bedccf8f6e556b40a645eda9d00fb56aa5d7
  cd "$OUT/still"
  npm ci --ignore-scripts --no-audit --no-fund
  npm run still2rig-psd -- prepare "$SOURCE" --name cymatic-benchmark
  find .still2rig-psd/jobs -maxdepth 3 -type f | head -25
  echo "PREPARED: See-through segmentation requires approved GPU/Colab inference (NOT RUN)"
  ;;
psd)
  fetch psd tsunehimatoi/psd2live 5cd83546996caa1f061d37bb8da9fd57ac488503
  cd "$OUT/psd"
  chmod +x gradlew
  timeout 420 ./gradlew test --no-daemon --console=plain
  echo "PASS: PSD2Live engine unit tests; cannot rig single flattened PNG without layered source"
  ;;
kit)
  fetch kit Ariakage/live2d-agent-kit 354d95800b7d498246dfb658e0e2ee379c29caa4
  cd "$OUT/kit"
  java --source 21 examples/minimal-model/GenerateExample.java work/minimal/assets
  test -s work/minimal/assets/manifest.json
  # Native model exporter uses a pinned PSD2Live engine and its own downloaded prerequisites.
  timeout 420 bash scripts/setup-psd2live.sh
  timeout 420 bash scripts/export-model.sh work/minimal/assets/manifest.json work/minimal/low
  timeout 120 bash scripts/validate.sh --model work/minimal/low/Minimal.model3.json
  echo "PASS: original geometric sample exported; user avatar requires segmentation+layer repair"
  ;;
cubism)
  fetch cubism nana7chi/CubismExternalEditMCP 863ebc87d0feafd841cf3877b16f0311047b9448
  cd "$OUT/cubism"
  python -m compileall -q .
  echo "CODE CHECK: Python modules compile"
  echo "BLOCKED: requires running authorized Cubism Editor 5.4 Alpha; no current compatible editor available"
  ;;
*)
  echo "Unknown test mode: $MODE" >&2
  exit 2
  ;;
esac
