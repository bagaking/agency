#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

required=(
  "${ROOT_DIR}/SKILL.md"
  "${ROOT_DIR}/SKILL_PAYLOAD.json"
  "${ROOT_DIR}/README.md"
  "${ROOT_DIR}/Makefile"
  "${ROOT_DIR}/gate/anti-patterns/rules.toml"
  "${ROOT_DIR}/gate/anti-patterns/check-anti-patterns.py"
  "${ROOT_DIR}/reference/quality-gates.md"
  "${ROOT_DIR}/reference/writing-techniques.md"
  "${ROOT_DIR}/reference/start-here.md"
  "${ROOT_DIR}/reference/tpl/sketch-template.md"
  "${ROOT_DIR}/reference/tpl/execution-appendix-template.md"
  "${ROOT_DIR}/reference/tpl/review-report-template.md"
  "${ROOT_DIR}/scripts/check-sketch.py"
)

for file in "${required[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "error: missing required file: ${file}" >&2
    exit 1
  fi
done

python3 "${ROOT_DIR}/gate/anti-patterns/check-anti-patterns.py" \
  --skill-md "${ROOT_DIR}/SKILL.md" \
  --rules "${ROOT_DIR}/gate/anti-patterns/rules.toml"

python3 "${ROOT_DIR}/scripts/check-sketch.py" \
  --input "${ROOT_DIR}/reference/tpl/sketch-template.md" \
  --strict \
  --report "${ROOT_DIR}/reference/tpl/review-report-sample.md"

echo "ok: skill validation passed"
