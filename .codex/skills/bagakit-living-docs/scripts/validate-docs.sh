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
      in = 0
      has_title = 0
      has_required = 0
      has_sop = 0
      has_sop_item = 0
    }
    NR == 1 {
      if ($0 != "---") {
        exit 2
      }
      in = 1
      next
    }
    in == 1 && $0 == "---" {
      in = 0
      if (has_title && has_required && has_sop && has_sop_item) {
        exit 0
      }
      exit 3
    }
    in == 1 {
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
      if (in == 1) {
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
  for must_file in must-docs-taxonomy.md must-guidebook.md must-sop.md; do
    if [[ ! -f "${docs_dir}/${must_file}" ]]; then
      fail "missing required system doc: ${docs_dir}/${must_file}"
    fi
  done
fi

if [[ -f "$agents_file" ]]; then
  if ! grep -q "<!-- BAGAKIT:LIVEDOCS:START -->" "$agents_file"; then
    fail "missing BAGAKIT managed block start in ${agents_file}"
  fi
  if ! grep -q "<!-- BAGAKIT:LIVEDOCS:END -->" "$agents_file"; then
    fail "missing BAGAKIT managed block end in ${agents_file}"
  fi
  if ! grep -q "\\[\\[Bagakit\\.LivingDoc\\]\\]" "$agents_file"; then
    fail "missing [[Bagakit.LivingDoc]] requirement in ${agents_file}"
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
shopt -s nullglob
for file in "$docs_dir"/*.md; do
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
done
shopt -u nullglob

if [[ $errors -gt 0 ]]; then
  echo "validation failed: ${errors} error(s), ${warnings} warning(s)" >&2
  exit 1
fi

echo "validation passed: ${warnings} warning(s)"
