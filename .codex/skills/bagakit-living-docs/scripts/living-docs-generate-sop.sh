#!/usr/bin/env sh
set -eu

usage() {
  echo "Usage: $(basename "$0") <project_root> [--docs-dir docs] [--output docs/must-sop.md]" >&2
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

project_root=$1
shift

docs_dir="docs"
output=""

while [ $# -gt 0 ]; do
  case "$1" in
    --docs-dir)
      shift
      [ $# -gt 0 ] || usage
      docs_dir=$1
      ;;
    --output)
      shift
      [ $# -gt 0 ] || usage
      output=$1
      ;;
    -h|--help)
      usage
      ;;
    *)
      usage
      ;;
  esac
  shift
done

if [ -z "$output" ]; then
  output="${docs_dir}/must-sop.md"
fi

root_abs=$(cd "$project_root" 2>/dev/null && pwd)
if [ -z "${root_abs:-}" ]; then
  echo "error: invalid project_root: $project_root" >&2
  exit 1
fi

docs_abs="${root_abs}/${docs_dir}"

# Support absolute output paths (useful for doctor comparisons without touching repo).
case "$output" in
  /*) out_abs="$output" ;;
  *) out_abs="${root_abs}/${output}" ;;
esac

mkdir -p "$(dirname "$out_abs")"

tmp="${out_abs}.tmp.$$"

{
  echo "# Project SOP"
  echo
  echo "This SOP is generated from docs frontmatter. Do not edit manually."
  echo
  echo "## Update Requirements"
  echo "- When a document with SOP frontmatter changes, regenerate this file and commit the result:"
  echo '  - `export BAGAKIT_LIVING_DOCS_SKILL_DIR="${BAGAKIT_LIVING_DOCS_SKILL_DIR:-${BAGAKIT_HOME:-$HOME/.bagakit}/skills/bagakit-living-docs}"`'
  echo '  - `sh "$BAGAKIT_LIVING_DOCS_SKILL_DIR/scripts/living-docs-generate-sop.sh" .`'
  echo "- Add new SOP items by updating the \`sop\` list in the source document frontmatter."
  echo "- Keep SOP items small and actionable; use the source document for details."
  echo
  echo "## SOP Items"
  echo

  if [ -d "$docs_abs" ]; then
    # Iterate deterministically.
    # Exclude the generated SOP output and Bagakit internal dirs under docs/.bagakit/.
    find "$docs_abs" \
      -type d -name ".bagakit" -prune -o \
      -type f -name "*.md" ! -name "must-sop.md" -print 2>/dev/null | LC_ALL=C sort | \
      while IFS= read -r file; do
        awk -v root="$root_abs" -v file_path="$file" '
        function relpath(p) {
          sub("^" root "/?", "", p)
          gsub("\\\\", "/", p)
          return p
        }
        BEGIN {
          title = ""
          rel = relpath(file_path)
          in_fm = 0
          in_sop = 0
          in_dir = 0
          sop_count = 0
          dir_count = 0
        }
        FNR == 1 && $0 == "---" { in_fm = 1; next }
        in_fm == 1 && $0 == "---" { in_fm = 0; in_sop = 0; in_dir = 0; next }
        in_fm == 1 {
          if ($0 ~ /^title:[[:space:]]*/) {
            sub(/^title:[[:space:]]*/, "", $0)
            gsub(/^["'\''"]|["'\''"]$/, "", $0)
            title = $0
          }
          if ($0 ~ /^sop:[[:space:]]*$/) { in_sop = 1; next }
          if (in_sop == 1) {
            if ($0 ~ /^[A-Za-z0-9_-]+:[[:space:]]*/ && $0 !~ /^[[:space:]]+/) {
              in_sop = 0
            }
          }
          if ($0 ~ /^directives:[[:space:]]*$/) { in_dir = 1; next }
          if (in_dir == 1) {
            if ($0 ~ /^[A-Za-z0-9_-]+:[[:space:]]*/ && $0 !~ /^[[:space:]]+/) {
              in_dir = 0
            }
          }
          if (in_sop == 1 && $0 ~ /^[[:space:]]*-[[:space:]]+/) {
            sub(/^[[:space:]]*-[[:space:]]+/, "", $0)
            sop[++sop_count] = $0
          }
          if (in_dir == 1 && $0 ~ /^[[:space:]]*-[[:space:]]+/) {
            sub(/^[[:space:]]*-[[:space:]]+/, "", $0)
            dir[++dir_count] = $0
          }
        }
        END {
          if (sop_count <= 0 && dir_count <= 0) exit 0
          if (title == "") title = rel
          print "### " title
          print "Source: `" rel "`"
          for (i = 1; i <= sop_count; i++) print "- " sop[i]
          if (dir_count > 0) {
            print "- Directives:"
            for (j = 1; j <= dir_count; j++) print "  - " dir[j]
          }
          print ""
        }
        ' "$file"
      done
  fi
} > "$tmp"

# If no "### " sections were emitted, append a friendly marker.
if ! grep -q "^### " "$tmp"; then
  # Keep the file structure stable; insert after the SOP Items header block.
  # This is simplest: append a note at end.
  printf '%s\n\n' "_No SOP entries found._" >> "$tmp"
fi

mv "$tmp" "$out_abs"
