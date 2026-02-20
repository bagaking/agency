#!/usr/bin/env bash
set -euo pipefail
# BAGAKIT_COMMIT_SPEC_HOOK

MESSAGE_FILE="${1:-}"
if [[ -z "$MESSAGE_FILE" || ! -f "$MESSAGE_FILE" ]]; then
  exit 0
fi

declare -a CANDIDATES=()
if [[ -n "${BAGAKIT_COMMIT_SPEC_SKILL_DIR:-}" ]]; then
  CANDIDATES+=("$BAGAKIT_COMMIT_SPEC_SKILL_DIR")
fi
CANDIDATES+=("$HOME/.bagakit/skills/bagakit-git-commit-spec")
CANDIDATES+=("__SKILL_DIR_HINT__")

for dir in "${CANDIDATES[@]}"; do
  if [[ -x "$dir/scripts/bagakit-git-commit-spec.py" ]]; then
    exec python3 "$dir/scripts/bagakit-git-commit-spec.py" lint-message --message "$MESSAGE_FILE"
  fi
done

echo "warn: bagakit-git-commit-spec not found; skip commit message lint" >&2
exit 0
