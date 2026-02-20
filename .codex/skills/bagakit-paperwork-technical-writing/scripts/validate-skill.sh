#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

required=(
  "${ROOT_DIR}/SKILL.md"
  "${ROOT_DIR}/SKILL_PAYLOAD.json"
  "${ROOT_DIR}/README.md"
  "${ROOT_DIR}/references/quality-gates.md"
  "${ROOT_DIR}/references/writing-techniques.md"
  "${ROOT_DIR}/references/markdown-formatting.md"
  "${ROOT_DIR}/scripts/check-article.py"
)

for file in "${required[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "error: missing required file: ${file}" >&2
    exit 1
  fi
done

python3 "${ROOT_DIR}/scripts/check-article.py" \
  --input "${ROOT_DIR}/references/tpl/article-template.md" \
  --strict \
  --report "${ROOT_DIR}/references/tpl/review-report-sample.md"

echo "ok: skill validation passed"
