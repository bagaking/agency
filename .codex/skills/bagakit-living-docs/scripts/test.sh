#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

tmp="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT

echo "tmp=$tmp"

# Make the scratch project look like a coding + UI repo so checklist scaffolding is exercised.
cat >"$tmp/package.json" <<'EOF'
{}
EOF
mkdir -p "$tmp/src/components"
touch "$tmp/tailwind.config.js"

# Apply skill scaffolding to a scratch project.
"$root/scripts/apply-living-docs.sh" "$tmp" --force >/dev/null

# The applied project should have the update wrapper.
if [ ! -f "$tmp/scripts/bagakit_update.sh" ]; then
  echo "error: missing update wrapper: scripts/bagakit_update.sh" >&2
  exit 1
fi

# Default learning SOP doc should be present (non-system).
if [ ! -f "$tmp/docs/notes-continuous-learning.md" ]; then
  echo "error: missing default learning SOP doc: docs/notes-continuous-learning.md" >&2
  exit 1
fi

# Reusable items governance + starter catalogs should be present.
if [ ! -f "$tmp/docs/norms-maintaining-reusable-items.md" ]; then
  echo "error: missing reusable items governance doc: docs/norms-maintaining-reusable-items.md" >&2
  exit 1
fi
if [ ! -f "$tmp/docs/notes-reusable-items-coding.md" ]; then
  echo "error: missing coding reusable-items catalog: docs/notes-reusable-items-coding.md" >&2
  exit 1
fi
if [ ! -f "$tmp/docs/notes-reusable-items-design.md" ]; then
  echo "error: missing design reusable-items catalog: docs/notes-reusable-items-design.md" >&2
  exit 1
fi

# Add one non-system doc with SOP frontmatter.
cat >"$tmp/docs/norms-sample.md" <<'EOF'
---
title: Sample Norms
required: true
sop:
  - Read this doc before changing sample behavior.
  - Update this doc when sample rules change.
directives:
  - DEBUG: When debugging, include a final-response attempt summary, using `<problem> (try-<n>): <one-line approach>`.
---

# Sample Norms

This is a sample doc for testing SOP generation.
EOF

# Generate SOP with the shell generator (no extra deps).
sh "$tmp/scripts/bagakit_generate_sop.sh" "$tmp"

if ! grep -q "### Sample Norms" "$tmp/docs/must-sop.md"; then
  echo "error: SOP did not include expected section" >&2
  exit 1
fi
if ! grep -q "Directives:" "$tmp/docs/must-sop.md"; then
  echo "error: SOP did not include expected directives marker" >&2
  exit 1
fi
if ! grep -q "DEBUG: When debugging" "$tmp/docs/must-sop.md"; then
  echo "error: SOP did not include expected directive item" >&2
  exit 1
fi
if ! grep -q "### Continuous Learning (Default)" "$tmp/docs/must-sop.md"; then
  echo "error: SOP did not include default continuous-learning section" >&2
  exit 1
fi

# Add memory content and verify search/get (baseline sh tool).
cat >"$tmp/docs/.bagakit/memory/decision-doc-naming.md" <<'EOF'
---
title: Use type-first filenames for docs
kind: decision
confidence: high
tags:
  - docs
created: 2026-01-30
updated: 2026-01-30
---

We decided to use type-first filenames for docs.
EOF

sh "$tmp/scripts/bagakit_memory.sh" search "type-first filenames" --root "$tmp" --max-results 3 >/dev/null
sh "$tmp/scripts/bagakit_memory.sh" get "docs/.bagakit/memory/decision-doc-naming.md" --root "$tmp" --from 1 --lines 8 >/dev/null

# Inbox workflow: create and promote.
sh "$tmp/scripts/bagakit_inbox.sh" new decision "ci-integration" --root "$tmp" --title "CI integration decision" >/dev/null
inbox_file="docs/.bagakit/inbox/decision-ci-integration.md"
if [ ! -f "$tmp/$inbox_file" ]; then
  echo "error: inbox new did not create expected file: $inbox_file" >&2
  exit 1
fi
sh "$tmp/scripts/bagakit_inbox.sh" promote "$inbox_file" --root "$tmp" >/dev/null
if [ ! -f "$tmp/docs/.bagakit/memory/decision-ci-integration.md" ]; then
  echo "error: inbox promote did not create expected memory file" >&2
  exit 1
fi

# Optional FTS index (may fail if Python's sqlite lacks FTS5).
if python3 "$tmp/scripts/bagakit_memory_index.py" index --root "$tmp" --quiet 2>/dev/null; then
  python3 "$tmp/scripts/bagakit_memory_index.py" search "type-first filenames" --root "$tmp" >/dev/null
fi

# Validate the applied project.
"$root/scripts/validate-docs.sh" "$tmp" >/dev/null
# The applied project should have its own validator installed too.
"$tmp/scripts/validate-docs.sh" "$tmp" >/dev/null

# Reusable-items query helper should work (Python path).
python3 "$tmp/scripts/bagakit_reusable_items.py" list --root "$tmp" >/dev/null
python3 "$tmp/scripts/bagakit_reusable_items.py" search "name" --root "$tmp" --max-results 3 >/dev/null || true

# Doctor should run (non-destructive).
sh "$tmp/scripts/bagakit_doctor.sh" "$tmp" >/dev/null

# Update wrapper should be able to re-apply when given an explicit skill dir.
sh "$tmp/scripts/bagakit_update.sh" apply --root "$tmp" --skill-dir "$root" --overwrite >/dev/null

# Learning helper: extract a minimal session JSONL into inbox.
cat >"$tmp/session.jsonl" <<'EOF'
{"timestamp":"2026-01-30T16:54:38.289Z","type":"session_meta","payload":{"id":"deadbeef-0000-0000-0000-000000000000","timestamp":"2026-01-30T16:54:38.256Z","cwd":"/tmp/demo","cli_version":"0.0.0","model_provider":"codex"}}
{"timestamp":"2026-01-30T16:55:00.000Z","type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"rg 报错了，怎么修？"}]}}
{"timestamp":"2026-01-30T16:55:01.000Z","type":"response_item","payload":{"type":"function_call","name":"shell_command","arguments":"{\"command\":\"bash -lc \\\"rg -n dist .\\\"\",\"workdir\":\"/tmp/demo\"}"},"call_id":"call_123"}
{"timestamp":"2026-01-30T16:55:02.000Z","type":"response_item","payload":{"type":"function_call_output","output":"Exit code: 2\nOutput:\nrg: unrecognized option","call_id":"call_123"}}
{"timestamp":"2026-01-30T16:55:03.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"用正确的参数；另外注意 shell quoting。"}]}}
EOF

learn_out=$(sh "$tmp/scripts/bagakit_learning.sh" extract --root "$tmp" --session "$tmp/session.jsonl")
if [ ! -f "$tmp/$learn_out" ]; then
  echo "error: learning extract did not create expected inbox file: $learn_out" >&2
  exit 1
fi
if ! grep -q "deadbeef" "$tmp/$learn_out"; then
  echo "error: learning extract did not include expected session meta" >&2
  exit 1
fi

echo "ok"
