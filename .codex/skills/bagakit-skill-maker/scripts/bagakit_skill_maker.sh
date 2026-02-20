#!/usr/bin/env sh
set -eu

usage() {
  cat >&2 <<'EOF'
Usage:
  sh scripts/bagakit_skill_maker.sh init --name <skill-name> [--path <dir>] [--with-agents]
  sh scripts/bagakit_skill_maker.sh validate --skill-dir <dir>
EOF
  exit 1
}

[ $# -ge 1 ] || usage

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
py_file="${script_dir}/bagakit_skill_maker.py"
py=${PYTHON3:-python3}

[ -f "$py_file" ] || {
  echo "error: missing ${py_file}" >&2
  exit 2
}

exec "$py" "$py_file" "$@"
