#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $(basename "$0") <project_root> [--force]" >&2
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

project_root="$1"
shift
force=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      force=1
      ;;
    *)
      usage
      ;;
  esac
  shift
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_root="$(cd "${script_dir}/.." && pwd)"
refs_dir="${skill_root}/references"
docs_dir="${project_root}/docs"
agents_file="${project_root}/AGENTS.md"
block_file="${refs_dir}/agents-block-template.md"
start_tag="<!-- BAGAKIT:LIVEDOCS:START -->"
end_tag="<!-- BAGAKIT:LIVEDOCS:END -->"

copy_template() {
  local src="$1"
  local dest="$2"

  if [[ -f "$dest" && $force -eq 0 ]]; then
    echo "skip: ${dest} already exists"
    return 0
  fi

  cp "$src" "$dest"
  echo "write: ${dest}"
}

if [[ ! -d "$refs_dir" ]]; then
  echo "missing references dir: ${refs_dir}" >&2
  exit 1
fi

mkdir -p "$docs_dir"

copy_template "${refs_dir}/docs-taxonomy-template.md" "${docs_dir}/must-docs-taxonomy.md"
copy_template "${refs_dir}/guidebook-template.md" "${docs_dir}/must-guidebook.md"
copy_template "${refs_dir}/sop-template.md" "${docs_dir}/must-sop.md"

block_content="$(cat "$block_file")"

if [[ -f "$agents_file" ]]; then
  if grep -q "${start_tag}" "$agents_file"; then
    awk -v start="$start_tag" -v end="$end_tag" -v block="$block_content" '
      BEGIN { in_block = 0 }
      $0 == start {
        print block
        in_block = 1
        next
      }
      in_block {
        if ($0 == end) {
          in_block = 0
        }
        next
      }
      { print }
    ' "$agents_file" > "${agents_file}.tmp"
    mv "${agents_file}.tmp" "$agents_file"
    echo "update: ${agents_file} (replaced block)"
  else
    printf "\n%s\n" "$block_content" >> "$agents_file"
    echo "update: ${agents_file} (appended block)"
  fi
else
  printf "%s\n" "$block_content" > "$agents_file"
  echo "write: ${agents_file}"
fi

if ! grep -q "\\[\\[Bagakit\\.LivingDoc\\]\\]" "$agents_file"; then
  echo "warning: AGENTS.md does not mention [[Bagakit.LivingDoc]]" >&2
fi
