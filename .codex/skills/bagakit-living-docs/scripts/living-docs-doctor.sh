#!/usr/bin/env sh
set -eu

usage() {
  cat >&2 <<'EOF'
Usage:
  sh scripts/living-docs-doctor.sh <project_root>

Outputs:
  ok: ...
  warn: ...
  suggest: ...

This is a diagnostic tool (non-destructive). It does not modify files.
EOF
  exit 1
}

if [ $# -ne 1 ]; then
  usage
fi

project_root=$1
root=$(cd "$project_root" 2>/dev/null && pwd) || { echo "warn: invalid project_root: $project_root"; exit 2; }

say_ok() { echo "ok: $*"; }
say_warn() { echo "warn: $*"; }
say_suggest() { echo "suggest: $*"; }

exists() { [ -e "$1" ]; }

docs_dir="$root/docs"
agents_file="$root/AGENTS.md"
bagakit_dir="$docs_dir/.bagakit"
tool_scripts_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

tooling_hint='export BAGAKIT_LIVING_DOCS_SKILL_DIR="${BAGAKIT_LIVING_DOCS_SKILL_DIR:-${BAGAKIT_HOME:-$HOME/.bagakit}/skills/bagakit-living-docs}"'
apply_hint='bash "$BAGAKIT_LIVING_DOCS_SKILL_DIR/scripts/apply-living-docs.sh" .'
validate_hint='bash "$BAGAKIT_LIVING_DOCS_SKILL_DIR/scripts/validate-docs.sh" .'
gen_sop_hint='sh "$BAGAKIT_LIVING_DOCS_SKILL_DIR/scripts/living-docs-generate-sop.sh" .'
inbox_list_hint='sh "$BAGAKIT_LIVING_DOCS_SKILL_DIR/scripts/living-docs-inbox.sh" list --root .'
inbox_new_hint='sh "$BAGAKIT_LIVING_DOCS_SKILL_DIR/scripts/living-docs-inbox.sh" new decision docs-ci-gate --root . --title "Docs CI gate"'

if [ -d "$docs_dir" ]; then
  say_ok "docs directory present (docs/)"
else
  say_warn "missing docs directory: $docs_dir"
  say_suggest "scaffold docs/memory (example): ${tooling_hint} && ${apply_hint}"
fi

for f in must-docs-taxonomy.md must-guidebook.md must-memory.md must-sop.md; do
  if [ -f "$docs_dir/$f" ]; then
    say_ok "system doc present: docs/$f"
  else
    say_warn "missing system doc: docs/$f"
    say_suggest "scaffold missing system docs (example): ${tooling_hint} && ${apply_hint}"
  fi
done

# Managed AGENTS block checks.
if [ -f "$agents_file" ]; then
  if grep -q "<!-- BAGAKIT:LIVEDOCS:START -->" "$agents_file" && grep -q "<!-- BAGAKIT:LIVEDOCS:END -->" "$agents_file"; then
    say_ok "AGENTS.md managed block present"
  else
    say_warn "AGENTS.md missing managed block markers"
    say_suggest "inject managed AGENTS.md block (example): ${tooling_hint} && ${apply_hint}"
  fi
  if grep -q "\\[\\[BAGAKIT\\]\\]" "$agents_file" && grep -q "LivingDoc:" "$agents_file"; then
    say_ok "AGENTS.md requires response footer [[BAGAKIT]] (LivingDoc)"
  else
    say_warn "AGENTS.md missing [[BAGAKIT]] footer requirement"
    say_suggest "inject missing footer requirement (example): ${tooling_hint} && ${apply_hint}"
  fi
else
  say_warn "missing AGENTS.md: $agents_file"
  say_suggest "create AGENTS.md with managed block (example): ${tooling_hint} && ${apply_hint}"
fi

# SOP freshness: compare generated SOP with current file when possible.
if [ -f "$tool_scripts_dir/living-docs-generate-sop.sh" ] && [ -d "$docs_dir" ]; then
  tmp="$(mktemp 2>/dev/null || true)"
  if [ -z "${tmp:-}" ]; then
    say_warn "failed to create tmp file for SOP comparison"
  elif sh "$tool_scripts_dir/living-docs-generate-sop.sh" "$root" --output "$tmp" >/dev/null 2>&1; then
    if [ -f "$docs_dir/must-sop.md" ] && cmp -s "$docs_dir/must-sop.md" "$tmp" 2>/dev/null; then
      say_ok "docs/must-sop.md is up to date"
    else
      say_warn "docs/must-sop.md differs from generated output"
      say_suggest "run: ${tooling_hint} && ${gen_sop_hint}"
    fi
  else
    say_warn "failed to generate SOP for comparison"
  fi
  if [ -n "${tmp:-}" ]; then
    rm -f "$tmp" 2>/dev/null || true
  fi
fi

# Memory/inbox structure hints.
if [ -d "$bagakit_dir/memory" ]; then
  say_ok "memory directory present (docs/.bagakit/memory/)"
else
  say_warn "missing memory directory: $bagakit_dir/memory"
  say_suggest "scaffold docs/.bagakit/memory (example): ${tooling_hint} && ${apply_hint}"
fi
if [ -d "$bagakit_dir/inbox" ]; then
  say_ok "inbox directory present (docs/.bagakit/inbox/)"
  inbox_count=$(find "$bagakit_dir/inbox" -type f -name "*.md" ! -name "README.md" 2>/dev/null | wc -l | tr -d ' ')
  if [ "${inbox_count:-0}" != "0" ]; then
    say_warn "inbox contains ${inbox_count} file(s); consider promoting durable items"
    say_suggest "run: ${tooling_hint} && ${inbox_list_hint}"
  fi
else
  say_warn "missing inbox directory: $bagakit_dir/inbox"
  say_suggest "scaffold docs/.bagakit/inbox (example): ${tooling_hint} && ${apply_hint}"
fi

# No legacy layout support: only docs/.bagakit/{memory,inbox}/ is supported.

# CI detection: suggest wiring validation, but don't enforce.
if [ -d "$root/.github/workflows" ]; then
  say_ok "detected GitHub Actions (.github/workflows/)"
  if ! grep -R -n -E "validate-docs\\.sh|living-docs-generate-sop\\.sh" "$root/.github/workflows" >/dev/null 2>&1; then
    say_suggest "consider adding a workflow step to run: ${tooling_hint} && ${validate_hint} && ${gen_sop_hint}"
    say_suggest "record decision in inbox if you choose not to: ${tooling_hint} && ${inbox_new_hint}"
  fi
fi
if [ -f "$root/.gitlab-ci.yml" ]; then
  say_ok "detected GitLab CI (.gitlab-ci.yml)"
  if ! grep -n -E "validate-docs\\.sh|living-docs-generate-sop\\.sh" "$root/.gitlab-ci.yml" >/dev/null 2>&1; then
    say_suggest "consider adding a job to run: ${tooling_hint} && ${validate_hint} && ${gen_sop_hint}"
  fi
fi

exit 0
