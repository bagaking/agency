---
name: agency-packaging-manager
description: Packaging, installation, and troubleshooting workflow for the Agency Electron editor on macOS. Use when building DMG/ZIP outputs, installing the app, or diagnosing packaged launch/blank UI issues, including runtime logs and asset paths.
---

# Agency Packaging Manager

## Quick start
- Use pnpm for dependencies and packaging.
- Run packaging from repo root with `make editor-package`.
- Use the `:strict` packaging variants only when you intentionally want bundle-governance enforcement in the same run.
- Validate installs by launching the packaged app and checking runtime logs.

## Workflow
1. Confirm dependencies and the repo root.
2. Build/package with the standard commands.
3. Install the DMG/ZIP output and verify UI.
4. If the UI fails, follow the troubleshooting checklist and capture logs.

## References
- Read `references/agency-editor-packaging.md` for commands, install steps, debugging flow, and lessons learned.
