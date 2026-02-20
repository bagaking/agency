#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $(basename "$0") <project_root> [--force] [--vendor-scripts]" >&2
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

project_root="$1"
shift
force=0
vendor_scripts=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      force=1
      ;;
    --vendor-scripts)
      vendor_scripts=1
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
tpl_dir="${refs_dir}/tpl"
reusable_items_dir="${tpl_dir}/reusable-items"
docs_dir="${project_root}/docs"
agents_file="${project_root}/AGENTS.md"
block_file="${tpl_dir}/agents-block-template.md"
start_tag="<!-- BAGAKIT:LIVEDOCS:START -->"
end_tag="<!-- BAGAKIT:LIVEDOCS:END -->"
bagakit_dir="${docs_dir}/.bagakit"
bagakit_generated_dir="${bagakit_dir}/.generated"

# Detect whether we're adopting into an existing docs tree (before we create dirs).
# This allows seeding optional adoption helpers without impacting fresh repos.
had_docs_files=0
if [[ -d "$docs_dir" ]]; then
  if find "$docs_dir" -type d -name ".bagakit" -prune -o -type f -name "*.md" -print -quit 2>/dev/null | grep -q .; then
    had_docs_files=1
  fi
fi

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

  # Scripts are treated as managed/vendor tooling: keep them up-to-date by default.
  # (Docs are project-owned; they are not overwritten unless --force is used.)
  local existed=0
  if [[ -e "$dest" ]]; then
    existed=1
  fi

  if [[ -f "$dest" ]] && cmp -s "$src" "$dest" 2>/dev/null; then
    echo "skip: ${dest} (unchanged)"
  else
    cp "$src" "$dest"
    if [[ -f "$dest" ]]; then
      chmod +x "$dest" 2>/dev/null || true
    fi
    if [[ $existed -eq 1 ]]; then
      echo "update: ${dest}"
    else
      echo "write: ${dest}"
    fi
  fi
}

if [[ ! -d "$refs_dir" ]]; then
  echo "missing references dir: ${refs_dir}" >&2
  exit 1
fi

if [[ ! -d "$tpl_dir" ]]; then
  echo "missing templates dir: ${tpl_dir}" >&2
  exit 1
fi

if [[ ! -d "$reusable_items_dir" ]]; then
  echo "missing reusable-items templates dir: ${reusable_items_dir}" >&2
  exit 1
fi

mkdir -p "$docs_dir"
mkdir -p "$bagakit_dir" "$bagakit_generated_dir"

# Flat layout: rely on kind-first filenames (`decision-...`) instead of kind subdirs.
mkdir -p \
  "${bagakit_dir}/memory" \
  "${bagakit_dir}/inbox"

# Directory guidance (kept in-repo, helpful to agents and humans).
copy_template "${tpl_dir}/memory-dir-readme-template.md" "${bagakit_dir}/memory/README.md"
copy_template "${tpl_dir}/inbox-dir-readme-template.md" "${bagakit_dir}/inbox/README.md"

copy_template "${tpl_dir}/docs-taxonomy-template.md" "${docs_dir}/must-docs-taxonomy.md"
copy_template "${tpl_dir}/guidebook-template.md" "${docs_dir}/must-guidebook.md"
copy_template "${tpl_dir}/sop-template.md" "${docs_dir}/must-sop.md"
copy_template "${tpl_dir}/memory-policy-template.md" "${docs_dir}/must-memory.md"

# Default continuous-learning SOP doc (non-system, optional).
copy_template "${tpl_dir}/notes-continuous-learning-template.md" "${docs_dir}/notes-continuous-learning.md"

# Adoption helpers (optional): only seed when adopting into an existing docs tree.
if [[ $had_docs_files -eq 1 ]]; then
  copy_template "${tpl_dir}/notes-adopting-living-docs-template.md" "${docs_dir}/notes-adopting-living-docs.md"
  copy_template "${tpl_dir}/guidelines-doc-coauthoring-template.md" "${docs_dir}/guidelines-doc-coauthoring.md"
  copy_template "${tpl_dir}/notes-directives-examples-template.md" "${docs_dir}/notes-directives-examples.md"
fi

# Reusable items governance (non-system; optional mechanism by default).
copy_template "${reusable_items_dir}/norms-maintaining-reusable-items-template.md" "${docs_dir}/norms-maintaining-reusable-items.md"

has_any_marker() {
  # Usage: has_any_marker <project_root> <path1> <path2> ...
  local root="$1"
  shift
  while [[ $# -gt 0 ]]; do
    if [[ -e "${root}/$1" ]]; then
      return 0
    fi
    shift
  done
  return 1
}

is_code_project=0
if has_any_marker "$project_root" \
  package.json go.mod Cargo.toml pyproject.toml requirements.txt Pipfile Gemfile \
  pom.xml build.gradle build.gradle.kts composer.json; then
  is_code_project=1
fi

if [[ $is_code_project -eq 1 ]]; then
  copy_template "${reusable_items_dir}/notes-reusable-items-coding-template.md" "${docs_dir}/notes-reusable-items-coding.md"
fi

is_ui_project=0
if [[ -f "${project_root}/package.json" ]]; then
  if has_any_marker "$project_root" \
    tailwind.config.js tailwind.config.cjs tailwind.config.mjs tailwind.config.ts \
    postcss.config.js postcss.config.cjs postcss.config.mjs postcss.config.ts \
    vite.config.js vite.config.ts next.config.js next.config.mjs astro.config.mjs nuxt.config.ts \
    .storybook src/components components app pages web frontend ui; then
    is_ui_project=1
  fi
fi

if [[ $is_ui_project -eq 1 ]]; then
  copy_template "${reusable_items_dir}/notes-reusable-items-design-template.md" "${docs_dir}/notes-reusable-items-design.md"
fi

if [[ $vendor_scripts -eq 1 ]]; then
  project_scripts_dir="${project_root}/scripts"
  mkdir -p "$project_scripts_dir"

  copy_script "${skill_root}/scripts/living-docs-generate-sop.sh" "${project_scripts_dir}/living-docs-generate-sop.sh"
  copy_script "${skill_root}/scripts/living-docs-memory.sh" "${project_scripts_dir}/living-docs-memory.sh"
  copy_script "${skill_root}/scripts/living-docs-memory-index.py" "${project_scripts_dir}/living-docs-memory-index.py"
  copy_script "${skill_root}/scripts/living-docs-inbox.sh" "${project_scripts_dir}/living-docs-inbox.sh"
  copy_script "${skill_root}/scripts/living-docs-doctor.sh" "${project_scripts_dir}/living-docs-doctor.sh"
  copy_script "${skill_root}/scripts/living-docs-learning.sh" "${project_scripts_dir}/living-docs-learning.sh"
  copy_script "${skill_root}/scripts/living-docs-learning.py" "${project_scripts_dir}/living-docs-learning.py"
  copy_script "${skill_root}/scripts/living-docs-learning-contract.sh" "${project_scripts_dir}/living-docs-learning-contract.sh"
  copy_script "${skill_root}/scripts/living-docs-learning-contract.py" "${project_scripts_dir}/living-docs-learning-contract.py"
  copy_script "${skill_root}/scripts/living-docs-reusable-items.sh" "${project_scripts_dir}/living-docs-reusable-items.sh"
  copy_script "${skill_root}/scripts/living-docs-reusable-items.py" "${project_scripts_dir}/living-docs-reusable-items.py"
  copy_script "${skill_root}/scripts/living-docs-update.sh" "${project_scripts_dir}/living-docs-update.sh"
  copy_script "${skill_root}/scripts/validate-docs.sh" "${project_scripts_dir}/validate-docs.sh"
fi

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
sh "${skill_root}/scripts/living-docs-generate-sop.sh" "${project_root}" >/dev/null

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

if ! grep -q "\\[\\[BAGAKIT\\]\\]" "$agents_file"; then
  echo "warning: AGENTS.md does not mention [[BAGAKIT]]" >&2
fi
