#!/usr/bin/env sh
set -eu

usage() {
  cat >&2 <<'EOF'
Usage:
  sh scripts/bagakit_learning.sh sessions [--codex-home <dir>] [--limit N]
  sh scripts/bagakit_learning.sh extract [--root <dir>] (--session <file.jsonl> | --last [--codex-home <dir>])
    [--kind <decision|preference|gotcha|glossary|howto>] [--topic <topic>] [--title <title>]

Notes:
- No new directories: outputs draft entries into docs/.bagakit/inbox/.
- Default behavior is *daily upsert*: if today's file exists, append a new "Session ..." section instead of creating duplicates.
- Use SOP (docs/must-sop.md) to decide *when* to run extraction since Codex has no hooks.
EOF
  exit 1
}

cmd=${1:-}
[ -n "${cmd:-}" ] || usage
shift || true

py=${PYTHON3:-python3}
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
py_file="$script_dir/bagakit_learning.py"

if [ ! -f "$py_file" ]; then
  echo "error: missing $py_file" >&2
  exit 2
fi

exec "$py" "$py_file" "$cmd" "$@"
