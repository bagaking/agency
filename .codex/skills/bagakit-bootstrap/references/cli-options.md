# CLI Options Contract

This skill is parameter-driven and does not persist project-local state files.

## Source modes

- `--source remote`: use installer script to pull from remote repositories.
- `--source local-copy`: copy runtime payload from local skill directories.
- `--source local-link`: create symlinks from destination to local skill directories (SSOT-style).

For local modes, set `--local-source-root <dir>` (or `BAGAKIT_LOCAL_SOURCE_ROOT`).

## Destination policy

- `--dest <dir>`: explicit destination.
- `--dest auto`: detect existing install root from candidate roots.

Auto detection priority:
1. Existing marker skills under candidate roots.
2. Existing `bagakit-*` folders under candidate roots.
3. First candidate root fallback.
4. Default fallback root when candidates are unavailable.

## Candidate roots

Candidate roots are collected from:
- `BAGAKIT_SKILLS_DIR` (if set),
- repeated `--candidate-root <dir>`,
- built-in defaults (`~/.codex/skills`, `~/.bagakit/skills`).

## Selection policy

- `core`: default when neither `--all` nor `--skill` is provided.
- `all`: enabled by `--all`.
- `selected`: enabled by one or more `--skill` values.

Selection is resolved against remote catalog (core + project catalogs).

## Installer source policy

- Default: remote URL template via `--installer-url-template` + `org/ref`.
- Fallback: `--installer-script <local-path>`.

## Catalog source policy

- Core catalog: `--catalog-url-template`.
- Project catalog: `--project-catalog-url-template`.
- Default URLs point to `bagakit/skills` raw catalog files for the given `org/ref`.
