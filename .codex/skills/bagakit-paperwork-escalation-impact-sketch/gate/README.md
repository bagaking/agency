# Gate Protocol

Use `gate/` as the validation protocol root.

- One subdirectory per validation case (for example `anti-patterns`).
- Each case directory must include:
  - `rules.toml` as the single-source rules file.
  - one or more `check-*.py|sh|js|ts` scripts that read `rules.toml`.
- Keep domain docs in `reference/`; keep execution scripts in `scripts/`; keep validation protocol in `gate/`.
