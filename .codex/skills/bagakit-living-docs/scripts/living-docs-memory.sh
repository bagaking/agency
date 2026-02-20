#!/usr/bin/env sh
set -eu

usage() {
  cat >&2 <<EOF
Usage:
  $(basename "$0") search <query> [--root <dir>] [--max-results N] [--snippets]
  $(basename "$0") get <path> [--root <dir>] [--from <line>] [--lines <n>]

Notes:
- Searches: docs/ (excluding docs/.bagakit/), docs/.bagakit/{memory,inbox}/.
- Output includes path + suggested line range; use "get" to quote exact lines.
EOF
  exit 1
}

cmd=${1:-}
[ -n "${cmd:-}" ] || usage
shift || true

root="."
max_results=6
from_line=""
lines=""
snippets=0

normalize_rel() {
  # Normalize backslashes and strip leading "./" only (do not strip "../").
  p=$1
  p=$(printf '%s' "$p" | sed -e 's#\\\\#/#g')
  while [ "${p#./}" != "$p" ]; do
    p=${p#./}
  done
  printf '%s\n' "$p"
}

is_allowed_path() {
  p=$(normalize_rel "$1")
  case "$p" in
    docs/*|docs) return 0 ;;
    *) return 1 ;;
  esac
}

safe_abs() {
  p=$(normalize_rel "$1")
  is_allowed_path "$p" || { echo "error: disallowed path: $p" >&2; exit 2; }
  case "$p" in
    /*|../*|*/../*|*/..|..) echo "error: unsafe path: $p" >&2; exit 2 ;;
  esac
  echo "${root%/}/$p"
}

case "$cmd" in
  search)
    [ $# -ge 1 ] || usage
    query=$1
    shift
    while [ $# -gt 0 ]; do
      case "$1" in
        --root)
          shift; [ $# -gt 0 ] || usage
          root=$1
          ;;
        --max-results)
          shift; [ $# -gt 0 ] || usage
          max_results=$1
          ;;
        --snippets)
          snippets=1
          ;;
        -h|--help) usage ;;
        *) break ;;
      esac
      shift
    done

    root_abs=$(cd "$root" 2>/dev/null && pwd) || { echo "error: invalid --root: $root" >&2; exit 2; }

    # Build a stable list of candidates (deduped).
    list_files() {
      # Project docs: docs/**/*.md, excluding docs/.bagakit/**.
      if [ -d "$root_abs/docs" ]; then
        find "$root_abs/docs" \
          -type d -name ".bagakit" -prune -o \
          -type f -name "*.md" -print 2>/dev/null
      fi

      # Bagakit memory/inbox stored under docs/.bagakit/** (committed).
      if [ -d "$root_abs/docs/.bagakit" ]; then
        find "$root_abs/docs/.bagakit" \
          -type d -name ".generated" -prune -o \
          -type f -name "*.md" -print 2>/dev/null
      fi

    }

    # Grep for matches; emit one hit per line with a small context window suggestion.
    # Note: grep -n is ubiquitous; we use -s to silence missing files/dirs.
    list_files | LC_ALL=C sort -u | \
      while IFS= read -r file; do
        # Use -H to always include filenames (we grep one file at a time).
        grep -n -H -s -F -- "$query" "$file" || true
      done | \
      awk -v root="$root_abs" -v limit="$max_results" -v snippets="$snippets" '
        function rel(p) { sub("^" root "/?", "", p); gsub("\\\\", "/", p); return p }
        BEGIN { count=0 }
        {
          # Format: file:line:match
          # Split on first ":" then second ":".
          file=$0
          sub(/:.*/, "", file)
          rest=$0
          sub(/^[^:]*:/, "", rest)
          line=rest
          sub(/:.*/, "", line)
          if (line ~ /^[0-9]+$/) {
            l = line + 0
            s = l - 2; if (s < 1) s = 1
            e = l + 2
            p = rel(file)
            print p ":" s "-" e
            if (snippets == 1) {
              # Print the matching line as a compact hint; use get() for full context.
              m = $0
              sub(/^[^:]*:[0-9]+:/, "", m)
              if (m != "") print m
              print "---"
            }
            count++
            if (count >= limit) exit 0
          }
        }
      '
    ;;

  get)
    [ $# -ge 1 ] || usage
    rel=$1
    shift
    while [ $# -gt 0 ]; do
      case "$1" in
        --root)
          shift; [ $# -gt 0 ] || usage
          root=$1
          ;;
        --from)
          shift; [ $# -gt 0 ] || usage
          from_line=$1
          ;;
        --lines)
          shift; [ $# -gt 0 ] || usage
          lines=$1
          ;;
        -h|--help) usage ;;
        *) break ;;
      esac
      shift
    done

    root_abs=$(cd "$root" 2>/dev/null && pwd) || { echo "error: invalid --root: $root" >&2; exit 2; }
    root="$root_abs"

    abs=$(safe_abs "$rel")
    [ -f "$abs" ] || { echo "error: file not found: $(normalize_rel "$rel")" >&2; exit 2; }

    if [ -z "${from_line:-}" ] && [ -z "${lines:-}" ]; then
      cat "$abs"
      exit 0
    fi

    start=${from_line:-1}
    count=${lines:-999999}
    case "$start" in ''|*[!0-9]*) start=1 ;; esac
    case "$count" in ''|*[!0-9]*) count=1 ;; esac
    if [ "$start" -lt 1 ]; then start=1; fi
    if [ "$count" -lt 1 ]; then count=1; fi

    end=$((start + count - 1))
    sed -n "${start},${end}p" "$abs"
    ;;

  *)
    usage
    ;;
esac
