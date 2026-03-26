#!/usr/bin/env sh
set -eu

root="${1:-.}"

if ! cd "$root" 2>/dev/null; then
  echo "error: invalid repo root: $root" >&2
  exit 1
fi

violations=$(
  find apps pkg scripts \
    \( -path '*/node_modules/*' -o -path '*/.electron-build/*' -o -path '*/dist/*' \) -prune -o \
    -type f \( -name '*.js' -o -name '*.cjs' -o -name '*.mjs' \) -print | LC_ALL=C sort
)

if [ -n "$violations" ]; then
  echo "error: governed source must not contain checked-in JS/CJS/MJS files:" >&2
  printf '%s\n' "$violations" >&2
  exit 1
fi

echo "OK: no governed JS/CJS/MJS files found."
