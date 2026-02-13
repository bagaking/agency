#!/usr/bin/env sh
set -eu

usage() {
  cat >&2 <<'EOF'
Usage:
  sh scripts/bagakit_doctor.sh <project_root>

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
scripts_dir="$root/scripts"
agents_file="$root/AGENTS.md"
bagakit_dir="$docs_dir/.bagakit"
default_codex_home="${CODEX_HOME:-$HOME/.codex}"
apply_hint="sh \"${default_codex_home}/skills/bagakit-living-docs/scripts/apply-living-docs.sh\" ."
update_hint="sh scripts/bagakit_update.sh apply"

if [ -d "$docs_dir" ]; then
  say_ok "docs directory present (docs/)"
else
  say_warn "missing docs directory: $docs_dir"
  if [ -f "$scripts_dir/bagakit_update.sh" ]; then
    say_suggest "scaffold docs/memory (example): ${update_hint}"
  else
    say_suggest "scaffold docs/memory by running Bagakit apply from the installed skill dir (example): ${apply_hint}"
  fi
fi

for f in must-docs-taxonomy.md must-guidebook.md must-memory.md must-sop.md; do
  if [ -f "$docs_dir/$f" ]; then
    say_ok "system doc present: docs/$f"
  else
    say_warn "missing system doc: docs/$f"
    if [ -f "$scripts_dir/bagakit_update.sh" ]; then
      say_suggest "scaffold missing system docs (example): ${update_hint}"
    else
      say_suggest "scaffold missing system docs (example): ${apply_hint}"
    fi
  fi
done

# Managed AGENTS block checks.
if [ -f "$agents_file" ]; then
  if grep -q "<!-- BAGAKIT:LIVEDOCS:START -->" "$agents_file" && grep -q "<!-- BAGAKIT:LIVEDOCS:END -->" "$agents_file"; then
    say_ok "AGENTS.md managed block present"
  else
    say_warn "AGENTS.md missing managed block markers"
    if [ -f "$scripts_dir/bagakit_update.sh" ]; then
      say_suggest "inject managed AGENTS.md block (example): ${update_hint}"
    else
      say_suggest "inject managed AGENTS.md block (example): ${apply_hint}"
    fi
  fi
  if grep -q "\\[\\[BAGAKIT\\]\\]" "$agents_file" && grep -q "LivingDoc:" "$agents_file"; then
    say_ok "AGENTS.md requires response footer [[BAGAKIT]] (LivingDoc)"
  else
    say_warn "AGENTS.md missing [[BAGAKIT]] footer requirement"
    if [ -f "$scripts_dir/bagakit_update.sh" ]; then
      say_suggest "inject missing footer requirement (example): ${update_hint}"
    else
      say_suggest "inject missing footer requirement (example): ${apply_hint}"
    fi
  fi
else
  say_warn "missing AGENTS.md: $agents_file"
  if [ -f "$scripts_dir/bagakit_update.sh" ]; then
    say_suggest "create AGENTS.md with managed block (example): ${update_hint}"
  else
    say_suggest "create AGENTS.md with managed block (example): ${apply_hint}"
  fi
fi

# Helper scripts presence.
for s in bagakit_generate_sop.sh bagakit_memory.sh bagakit_inbox.sh; do
  if [ -f "$scripts_dir/$s" ]; then
    say_ok "helper script present: scripts/$s"
  else
    say_warn "missing helper script: scripts/$s"
    if [ -f "$scripts_dir/bagakit_update.sh" ]; then
      say_suggest "install helper scripts (example): ${update_hint}"
    else
      say_suggest "install helper scripts (example): ${apply_hint}"
    fi
  fi
done

if [ -f "$scripts_dir/bagakit_memory_index.py" ]; then
  say_ok "optional index helper present: scripts/bagakit_memory_index.py"
else
  if [ -f "$scripts_dir/bagakit_update.sh" ]; then
    say_suggest "optional: install scripts/bagakit_memory_index.py for faster search (example): ${update_hint}"
  else
    say_suggest "optional: install scripts/bagakit_memory_index.py for faster search (example): ${apply_hint}"
  fi
fi

# SOP freshness: compare generated SOP with current file when possible.
if [ -f "$scripts_dir/bagakit_generate_sop.sh" ] && [ -d "$docs_dir" ]; then
  tmp="$(mktemp 2>/dev/null || true)"
  if [ -z "${tmp:-}" ]; then
    say_warn "failed to create tmp file for SOP comparison"
  elif sh "$scripts_dir/bagakit_generate_sop.sh" "$root" --output "$tmp" >/dev/null 2>&1; then
    if [ -f "$docs_dir/must-sop.md" ] && cmp -s "$docs_dir/must-sop.md" "$tmp" 2>/dev/null; then
      say_ok "docs/must-sop.md is up to date"
    else
      say_warn "docs/must-sop.md differs from generated output"
      say_suggest "run: sh scripts/bagakit_generate_sop.sh ."
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
  if [ -f "$scripts_dir/bagakit_update.sh" ]; then
    say_suggest "scaffold docs/.bagakit/memory (example): ${update_hint}"
  else
    say_suggest "scaffold docs/.bagakit/memory (example): ${apply_hint}"
  fi
fi
if [ -d "$bagakit_dir/inbox" ]; then
  say_ok "inbox directory present (docs/.bagakit/inbox/)"
  inbox_count=$(find "$bagakit_dir/inbox" -type f -name "*.md" ! -name "README.md" 2>/dev/null | wc -l | tr -d ' ')
  if [ "${inbox_count:-0}" != "0" ]; then
    say_warn "inbox contains ${inbox_count} file(s); consider promoting durable items"
    say_suggest "run: sh scripts/bagakit_inbox.sh list"
  fi
else
  say_warn "missing inbox directory: $bagakit_dir/inbox"
  if [ -f "$scripts_dir/bagakit_update.sh" ]; then
    say_suggest "scaffold docs/.bagakit/inbox (example): ${update_hint}"
  else
    say_suggest "scaffold docs/.bagakit/inbox (example): ${apply_hint}"
  fi
fi

# No legacy layout support: only docs/.bagakit/{memory,inbox}/ is supported.

# CI detection: suggest wiring validation, but don't enforce.
if [ -d "$root/.github/workflows" ]; then
  say_ok "detected GitHub Actions (.github/workflows/)"
  if ! grep -R -n -E "validate-docs\\.sh|bagakit_generate_sop\\.sh" "$root/.github/workflows" >/dev/null 2>&1; then
    say_suggest "consider adding a workflow step to run: ./scripts/validate-docs.sh . && sh scripts/bagakit_generate_sop.sh ."
    say_suggest "record decision in inbox if you choose not to: sh scripts/bagakit_inbox.sh new decision docs-ci-gate --title 'Docs CI gate'"
  fi
fi
if [ -f "$root/.gitlab-ci.yml" ]; then
  say_ok "detected GitLab CI (.gitlab-ci.yml)"
  if ! grep -n -E "validate-docs\\.sh|bagakit_generate_sop\\.sh" "$root/.gitlab-ci.yml" >/dev/null 2>&1; then
    say_suggest "consider adding a job to run: ./scripts/validate-docs.sh . && sh scripts/bagakit_generate_sop.sh ."
  fi
fi

exit 0
