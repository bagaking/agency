# Start Here

Use this skill when you want deterministic install/copy/link commands without local config files.

## Minimum path

1. Run `skills` to confirm available skill ids from remote catalog.
2. Choose source mode:
   - `remote`: pull from remote installer.
   - `local-copy`: copy from local source root.
   - `local-link`: symlink from local source root (SSOT-friendly).
3. Run `status --json` before execution if destination/source policy needs confirmation.

## Key signals

- Input signals: CLI flags + `BAGAKIT_SKILLS_DIR` + `BAGAKIT_LOCAL_SOURCE_ROOT`.
- Output signals: terminal command preview and optional `status --json` payload.

## Local fallback

If remote installer fetch is unavailable, pass `--installer-script <local-path>`, or switch to `local-copy` / `local-link`.
