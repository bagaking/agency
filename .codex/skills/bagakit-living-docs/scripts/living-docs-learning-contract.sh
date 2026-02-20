#!/usr/bin/env sh
set -eu

usage() {
  cat >&2 <<'EOF'
Usage:
  sh scripts/living-docs-learning-contract.sh validate --contract <signals.json>
  sh scripts/living-docs-learning-contract.sh export --root <project> [--source memory|inbox|both] [--output <signals.json>]
  sh scripts/living-docs-learning-contract.sh import --root <project> --contract <signals.json>
  sh scripts/living-docs-learning-contract.sh evolve --root <project> [--min-confidence 0.7]
EOF
  exit 1
}

[ $# -ge 1 ] || usage

py=${PYTHON3:-python3}
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
py_file="$script_dir/living-docs-learning-contract.py"
[ -f "$py_file" ] || {
  echo "error: missing $py_file" >&2
  exit 2
}

exec "$py" "$py_file" "$@"
