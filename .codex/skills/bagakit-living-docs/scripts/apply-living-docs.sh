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
project_scripts_dir="${project_root}/scripts"
bagakit_dir="${docs_dir}/.bagakit"
bagakit_generated_dir="${bagakit_dir}/.generated"

copy_template() {
  local src="$1"
  local dest="$2"

  # Allows the skill repo to dogfood itself safely (or any project) by skipping
  # copies where the destination already matches the source.
  if [[ -f "$dest" ]] && cmp -s "$src" "$dest" 2>/dev/null; then
    echo "skip: ${dest} (unchanged)"
    return 0
  fi

  if [[ -f "$dest" && $force -eq 0 ]]; then
    echo "skip: ${dest} already exists"
    return 0
  fi

  cp "$src" "$dest"
  echo "write: ${dest}"
}

copy_script() {
  local src="$1"
  local dest="$2"
  copy_template "$src" "$dest"
  if [[ -f "$dest" ]]; then
    chmod +x "$dest" 2>/dev/null || true
  fi
}

if [[ ! -d "$refs_dir" ]]; then
  echo "missing references dir: ${refs_dir}" >&2
  exit 1
fi

mkdir -p "$docs_dir"
mkdir -p "$project_scripts_dir"
mkdir -p "$bagakit_dir" "$bagakit_generated_dir"

# Flat layout: rely on kind-first filenames (`decision-...`) instead of kind subdirs.
mkdir -p \
  "${bagakit_dir}/memory" \
  "${bagakit_dir}/inbox"

# Directory guidance (kept in-repo, helpful to agents and humans).
copy_template "${refs_dir}/memory-dir-readme-template.md" "${bagakit_dir}/memory/README.md"
copy_template "${refs_dir}/inbox-dir-readme-template.md" "${bagakit_dir}/inbox/README.md"

copy_template "${refs_dir}/docs-taxonomy-template.md" "${docs_dir}/must-docs-taxonomy.md"
copy_template "${refs_dir}/guidebook-template.md" "${docs_dir}/must-guidebook.md"
copy_template "${refs_dir}/sop-template.md" "${docs_dir}/must-sop.md"
copy_template "${refs_dir}/memory-policy-template.md" "${docs_dir}/must-memory.md"

# Default continuous-learning SOP doc (non-system, optional).
copy_template "${refs_dir}/notes-continuous-learning-template.md" "${docs_dir}/notes-continuous-learning.md"

copy_script "${skill_root}/scripts/bagakit_generate_sop.sh" "${project_scripts_dir}/bagakit_generate_sop.sh"
copy_script "${skill_root}/scripts/bagakit_memory.sh" "${project_scripts_dir}/bagakit_memory.sh"
copy_script "${skill_root}/scripts/bagakit_memory_index.py" "${project_scripts_dir}/bagakit_memory_index.py"
copy_script "${skill_root}/scripts/bagakit_inbox.sh" "${project_scripts_dir}/bagakit_inbox.sh"
copy_script "${skill_root}/scripts/bagakit_doctor.sh" "${project_scripts_dir}/bagakit_doctor.sh"
copy_script "${skill_root}/scripts/bagakit_learning.sh" "${project_scripts_dir}/bagakit_learning.sh"
copy_script "${skill_root}/scripts/bagakit_learning.py" "${project_scripts_dir}/bagakit_learning.py"
copy_script "${skill_root}/scripts/validate-docs.sh" "${project_scripts_dir}/validate-docs.sh"

# Ignore generated artifacts locally without touching the project's root .gitignore.
# Keep this file committed so any repo that uses the layout stays clean by default.
generated_gitignore="${bagakit_generated_dir}/.gitignore"
if [[ ! -f "$generated_gitignore" || $force -eq 1 ]]; then
  cat >"$generated_gitignore" <<'EOF'
*
!.gitignore
EOF
  echo "write: ${generated_gitignore}"
fi

# Generate must-sop.md (removes placeholders and stays deterministic).
sh "${project_scripts_dir}/bagakit_generate_sop.sh" "${project_root}" >/dev/null

if [[ -f "$agents_file" ]]; then
  if grep -q "${start_tag}" "$agents_file"; then
    awk -v start="$start_tag" -v end="$end_tag" -v blockFile="$block_file" '
      function print_block() {
        while ((getline line < blockFile) > 0) {
          print line
        }
        close(blockFile)
      }
      BEGIN { in_block = 0 }
      $0 == start {
        print_block()
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
    printf "\n" >> "$agents_file"
    cat "$block_file" >> "$agents_file"
    printf "\n" >> "$agents_file"
    echo "update: ${agents_file} (appended block)"
  fi
else
  cat "$block_file" > "$agents_file"
  echo "write: ${agents_file}"
fi

if ! grep -q "\\[\\[Bagakit\\.LivingDoc\\]\\]" "$agents_file"; then
  echo "warning: AGENTS.md does not mention [[Bagakit.LivingDoc]]" >&2
fi
