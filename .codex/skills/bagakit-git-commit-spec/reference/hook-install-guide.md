# Hook Install Guide

## Goal

Install a `commit-msg` hook that enforces commit message spec validation automatically.

## Template Source

- Runtime template: `scripts/templates/commit-msg-template.sh`
- Install command:

```bash
sh scripts/bagakit-git-commit-spec.sh install-hooks --root .
```

## Install Modes

- During session init:
  - `--install-hooks ask` (default; prompt user in interactive shells),
  - `--install-hooks yes` (install directly),
  - `--install-hooks no` (skip).
- Use `--force` (or `--force-hooks` in init) only when intentionally replacing a pre-existing non-bagakit hook.

## Resolution Order Inside Hook

1. `BAGAKIT_COMMIT_SPEC_SKILL_DIR` environment variable
2. `$HOME/.bagakit/skills/bagakit-git-commit-spec`
3. installation-time absolute fallback path

If no skill runtime is found, hook emits a warning and does not block commit.
