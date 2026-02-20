#!/usr/bin/env sh
set -eu

usage() {
  cat >&2 <<'EOF'
Usage:
  sh scripts/living-docs-reusable-items.sh list [--root <project_root>] [--domain <d>] [--level MUST|SHOULD|NICE] [--format text|json]
  sh scripts/living-docs-reusable-items.sh search <query> [--root <project_root>] [--domain <d>] [--level MUST|SHOULD|NICE] [--max-results N] [--format text|json]

Reads Markdown tables in:
  docs/notes-reusable-items-*.md
EOF
  exit 1
}

cmd=""
root="."

if [ $# -lt 1 ]; then
  usage
fi
cmd=$1
shift

py="$(dirname "$0")/living-docs-reusable-items.py"
if command -v python3 >/dev/null 2>&1; then
  exec python3 "$py" "$cmd" "$@"
fi

# Fallback: best-effort grep search (no table parsing).
case "$cmd" in
  search)
    [ $# -ge 1 ] || usage
    q=$1
    shift
    while [ $# -gt 0 ]; do
      case "$1" in
        --root) shift; root=$1 ;;
        --domain|--level|--max-results|--format) shift ;;
        *) ;;
      esac
      shift
    done
    find "$root/docs" -maxdepth 1 -type f -name "notes-reusable-items-*.md" -print 2>/dev/null \
      | LC_ALL=C sort \
      | while IFS= read -r f; do
          # grep: best-effort; no structured parsing.
          grep -nF -- "$q" "$f" 2>/dev/null || true
        done
    ;;
  *)
    echo "error: python3 is required for '$cmd' (table parsing)" >&2
    exit 2
    ;;
esac
