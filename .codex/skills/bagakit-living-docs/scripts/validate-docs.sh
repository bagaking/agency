#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $(basename "$0") <project_root>" >&2
  exit 1
}

if [[ $# -ne 1 ]]; then
  usage
fi

project_root="$1"
docs_dir="${project_root}/docs"
agents_file="${project_root}/AGENTS.md"
bagakit_dir="${docs_dir}/.bagakit"
memory_dir="${bagakit_dir}/memory"
inbox_dir="${bagakit_dir}/inbox"
errors=0
warnings=0

fail() {
  echo "error: $1" >&2
  errors=$((errors + 1))
}

warn() {
  echo "warn: $1" >&2
  warnings=$((warnings + 1))
}

check_frontmatter() {
  local file="$1"
  awk '
    BEGIN {
      in_fm = 0
      has_title = 0
      has_required = 0
      has_sop = 0
      has_sop_item = 0
    }
    NR == 1 {
      if ($0 != "---") {
        exit 2
      }
      in_fm = 1
      next
    }
    in_fm == 1 && $0 == "---" {
      in_fm = 0
      if (has_title && has_required && has_sop && has_sop_item) {
        exit 0
      }
      exit 3
    }
    in_fm == 1 {
      if ($0 ~ /^title:[[:space:]]+/) {
        has_title = 1
      }
      if ($0 ~ /^required:[[:space:]]+/) {
        has_required = 1
      }
      if ($0 ~ /^sop:[[:space:]]*$/) {
        has_sop = 1
      }
      if (has_sop && $0 ~ /^[[:space:]]*-[[:space:]]+.+/) {
        has_sop_item = 1
      }
    }
    END {
      if (in_fm == 1) {
        exit 2
      }
      if (!(has_title && has_required && has_sop && has_sop_item)) {
        exit 3
      }
    }
  ' "$file"
}

if [[ ! -d "$docs_dir" ]]; then
  fail "missing docs directory: ${docs_dir}"
else
  for must_file in must-docs-taxonomy.md must-guidebook.md must-sop.md must-memory.md; do
    if [[ ! -f "${docs_dir}/${must_file}" ]]; then
      fail "missing required system doc: ${docs_dir}/${must_file}"
    fi
  done
  if [[ -f "${docs_dir}/must-sop.md" ]]; then
    if grep -q "<Doc Title>" "${docs_dir}/must-sop.md" 2>/dev/null; then
      warn "docs/must-sop.md looks like a template; regenerate with: export BAGAKIT_LIVING_DOCS_SKILL_DIR=\"\${BAGAKIT_LIVING_DOCS_SKILL_DIR:-\${BAGAKIT_HOME:-\$HOME/.bagakit}/skills/bagakit-living-docs}\" && sh \"\$BAGAKIT_LIVING_DOCS_SKILL_DIR/scripts/living-docs-generate-sop.sh\" ."
    fi
  fi
fi

if [[ -f "$agents_file" ]]; then
  if ! grep -q "<!-- BAGAKIT:LIVEDOCS:START -->" "$agents_file"; then
    fail "missing BAGAKIT managed block start in ${agents_file}"
  fi
  if ! grep -q "<!-- BAGAKIT:LIVEDOCS:END -->" "$agents_file"; then
    fail "missing BAGAKIT managed block end in ${agents_file}"
  fi
  if ! grep -q "\\[\\[BAGAKIT\\]\\]" "$agents_file"; then
    fail "missing [[BAGAKIT]] requirement in ${agents_file}"
  fi
  if ! grep -q "LivingDoc:" "$agents_file"; then
    fail "missing LivingDoc footer requirement in ${agents_file}"
  fi
else
  warn "missing AGENTS.md: ${agents_file}"
fi

taxonomy_file="${docs_dir}/must-docs-taxonomy.md"
if [[ -f "$taxonomy_file" ]]; then
  categories_line="$(grep -n '^## Categories' "$taxonomy_file" | head -n 1 | cut -d: -f1 || true)"
  system_line="$(grep -n '^## System Docs' "$taxonomy_file" | head -n 1 | cut -d: -f1 || true)"
  if [[ -n "$categories_line" && -n "$system_line" ]]; then
    if [[ "$categories_line" -gt "$system_line" ]]; then
      fail "docs taxonomy should list categories before system docs"
    fi
  fi
  if ! grep -q "must-" "$taxonomy_file"; then
    fail "docs taxonomy should mention the must- system prefix"
  fi
  if ! grep -q "norms-" "$taxonomy_file"; then
    fail "docs taxonomy should list type-first naming (example: norms-)"
  fi
fi

allowed_types="norms architecture guidelines notes runbook manual-test"

# Allow docs organization into subdirectories. Still enforce type-first naming by basename.
# Exclude Bagakit internal dirs under docs/.bagakit/.
while IFS= read -r file; do
  base="$(basename "$file")"
  if [[ "$base" == must-* ]]; then
    continue
  fi

  if [[ ! "$base" =~ ^([a-z0-9]+)-.+\.md$ ]]; then
    fail "doc name must be type-first (<type>-<topic>.md): ${base}"
    continue
  fi

  doc_type="${BASH_REMATCH[1]}"
  if [[ " ${allowed_types} " != *" ${doc_type} "* ]]; then
    fail "unknown doc type '${doc_type}' in ${base}"
  fi

  check_frontmatter "$file"
  case "$?" in
    0) ;;
    2) fail "missing frontmatter in ${base}" ;;
    3) fail "frontmatter missing title/required/sop or sop items in ${base}" ;;
    *) fail "frontmatter parse failed for ${base}" ;;
  esac
done < <(find "$docs_dir" -type d -name ".bagakit" -prune -o -type f -name "*.md" -print 2>/dev/null | LC_ALL=C sort)

# Soft duplication check (heuristic): the same <topic> appears in multiple doc types.
# This often indicates content that should be consolidated into one canonical doc with links.
topics_tmp="$(mktemp -t bagakit-doc-topics.XXXXXX)"
while IFS= read -r file; do
  base="$(basename "$file")"
  if [[ "$base" == must-* ]]; then
    continue
  fi
  if [[ "$base" =~ ^([a-z0-9]+)-(.+)\.md$ ]]; then
    doc_type="${BASH_REMATCH[1]}"
    topic="${BASH_REMATCH[2]}"
    if [[ " ${allowed_types} " == *" ${doc_type} "* ]]; then
      rel="${file#${project_root%/}/}"
      printf "%s\t%s\t%s\n" "$topic" "$doc_type" "$rel" >>"$topics_tmp"
    fi
  fi
done < <(find "$docs_dir" -type d -name ".bagakit" -prune -o -type f -name "*.md" -print 2>/dev/null | LC_ALL=C sort)

while IFS='|' read -r topic types files; do
  warn "doc topic '${topic}' appears in multiple doc types (${types}); consider merging/canonicalizing and linking (files: ${files})"
done < <(
  awk -F '\t' '
    {
      topic=$1; typ=$2; file=$3
      k=topic SUBSEP typ
      if (!(seen[k]++)) types[topic]=types[topic] " " typ
      files[topic]=files[topic] " " file
    }
    END {
      for (t in types) {
        n=0
        split(types[t], a, " ")
        for (i in a) if (a[i] != "") n++
        if (n > 1) {
          sub(/^ /, "", types[t])
          sub(/^ /, "", files[t])
          print t "|" types[t] "|" files[t]
        }
      }
    }
  ' "$topics_tmp" | LC_ALL=C sort
)
rm -f "$topics_tmp"

check_memory_frontmatter() {
  local file="$1"
  awk '
    BEGIN { in_fm=0; has_title=0; has_kind=0 }
    NR==1 { if ($0!="---") exit 2; in_fm=1; next }
    in_fm==1 && $0=="---" { in_fm=0; if (has_title && has_kind) exit 0; exit 3 }
    in_fm==1 {
      if ($0 ~ /^title:[[:space:]]+/) has_title=1
      if ($0 ~ /^kind:[[:space:]]+/) has_kind=1
    }
    END { if (in_fm==1) exit 2; if (!(has_title && has_kind)) exit 3 }
  ' "$file"
}

memory_kinds="decision preference gotcha glossary howto"
if [[ ! -d "$memory_dir" ]]; then
  fail "missing memory directory: ${memory_dir} (expected: docs/.bagakit/memory/)"
else
  while IFS= read -r file; do
    base="$(basename "$file")"
    if [[ "$base" == "README.md" ]]; then
      continue
    fi
    if [[ ! "$base" =~ ^([a-z0-9]+)-.+\.md$ ]]; then
      fail "memory name must be kind-first (<kind>-<topic>.md): ${base}"
      continue
    fi
    kind="${BASH_REMATCH[1]}"
    if [[ " ${memory_kinds} " != *" ${kind} "* ]]; then
      fail "unknown memory kind '${kind}' in ${base}"
    fi
    check_memory_frontmatter "$file"
    case "$?" in
      0) ;;
      2) warn "memory missing frontmatter: ${file}" ;;
      3) warn "memory frontmatter missing title/kind: ${file}" ;;
      *) warn "memory frontmatter parse failed: ${file}" ;;
    esac
  done < <(find "$memory_dir" -type f -name "*.md" 2>/dev/null | LC_ALL=C sort)
fi

if [[ ! -d "$inbox_dir" ]]; then
  fail "missing inbox directory: ${inbox_dir} (expected: docs/.bagakit/inbox/)"
else
  # README.md is allowed as directory guidance.
  :
fi

if [[ $errors -gt 0 ]]; then
  echo "validation failed: ${errors} error(s), ${warnings} warning(s)" >&2
  exit 1
fi

echo "validation passed: ${warnings} warning(s)"
