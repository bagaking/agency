# Agency Editor Packaging Guide (macOS)

## Scope
- Package the Electron app (DMG/ZIP) and install locally.
- Diagnose packaged startup issues, blank UI, and asset path errors.
- Record common failures and mitigations.

## Build and Package
From repo root:
```bash
make editor-package
```

From `apps/editor`:
```bash
pnpm run package
```

Release variants that also enforce the renderer bundle budget:
```bash
make editor-package-release
make editor-package-lite-release
make editor-package-dir-release

pnpm run package:release
pnpm run package:lite:release
pnpm run package:dir:release
```

Remove all generated `dist` outputs before retrying packaging:
```bash
make editor-package-clean
pnpm run package:clean
```

DMG-only packaging (lower peak disk usage than DMG + ZIP):
```bash
make editor-package-lite
pnpm run package:lite
```

Unpacked build (skip DMG):
```bash
pnpm run package:dir
```

Packaging prepare step:
- `pnpm run package`, `package:lite`, and `package:dir` now run `package:prepare` before the expensive build/sign/DMG stages.
- Release variants (`package:release`, `package:lite:release`, `package:dir:release`) use the same prepare step and also run the renderer bundle budget gate before packaging.
- The prepare step checks free space on:
  - the project volume
  - `/tmp`
  - `~/Library/Caches/electron-builder` (or its parent cache volume when the directory does not exist yet)
- Before packaging continues, the prepare step removes stale generated outputs in `apps/editor/dist/release` that would conflict with the current mode.
- If mode-specific cleanup is still not enough but deleting all generated `apps/editor/dist` outputs would make the build fit, the prepare step tells you to run `make editor-package-clean` before retrying.
- Threshold env overrides:
  - `AGENCY_PACKAGE_DMG_MIN_FREE_GIB`
  - `AGENCY_PACKAGE_LITE_MIN_FREE_GIB`
  - `AGENCY_PACKAGE_DIR_MIN_FREE_GIB`

Artifacts:
- `apps/editor/dist/release/Agency-<version>-arm64.dmg`
- `apps/editor/dist/release/Agency-<version>-arm64-mac.zip`
- `apps/editor/dist/release/mac-arm64/Agency.app`
- `make editor-package-lite` / `pnpm run package:lite` only emits the DMG artifact.

Renderer budget policy:
- `pnpm run build:renderer` only emits renderer assets.
- `pnpm run build:renderer:budget` emits assets and then enforces the renderer budget gate.
- `pnpm run accept:renderer-bundle-budget` refreshes the accepted-state file after an intentional budget decision.
- The budget gate uses `apps/editor/scripts/renderer-bundle-budget.accepted.json` as the accepted-state ratchet.
- JS and gzip budgets remain hard failures.
- Raw CSS drift is warning-only, so packageability is not blocked by minor Tailwind raw-size churn.

Why this split exists:
- Packaging answers “can we produce the desktop artifact?” and should not fail on small non-runtime bundle drift.
- Budget enforcement answers “did the boot footprint regress beyond the accepted state?” and belongs on the explicit budgeted/release entrypoints.
- This rejects the tempting but wrong shortcut of making every local package command enforce the same front-end budget gate.

## Install
1. Open the DMG and drag `Agency.app` into `/Applications`.
2. If Gatekeeper blocks launch, use one of:
   - Right-click `Agency.app` -> Open (once).
   - `xattr -dr com.apple.quarantine /Applications/Agency.app`

## Runtime Logs
If a project root is configured:
- `<repo>/logs/runtime/runtime-<timestamp>.log`

If no project is configured (or app starts outside a repo):
- `~/Library/Application Support/Agency/logs/runtime/runtime-<timestamp>.log`

Use these for renderer load failures, process crashes, and startup diagnostics.

## Troubleshooting Checklist

### Packaged app opens with no UI
1. Open the latest runtime log and look for:
   - `main window created`
   - `renderer loaded`
   - `renderer load failed`
   - `render-process-gone`
2. Launch from terminal to capture stdout/stderr:
   ```bash
   ELECTRON_ENABLE_LOGGING=1 ELECTRON_ENABLE_STACK_DUMPING=1 \
   /Applications/Agency.app/Contents/MacOS/Agency 2>&1 | tee /tmp/agency-launch.log
   ```
3. Verify the renderer was bundled:
   - Ensure `dist/renderer/index.html` is inside the app bundle (app.asar).
4. If the renderer fails to load, check:
   - `vite.config.js` uses `base: './'` for production.
   - Asset URLs use `import.meta.env.BASE_URL`.

### Dock icon crashes the app on startup
Symptom:
- Runtime log shows `Failed to load image from path ... app.asar/renderer/public/icon.png`.
Fix:
- Resolve icon via `process.resourcesPath` and guard against missing/empty images.

### DMG build fails (hdiutil)
If `electron-builder --mac` fails with `hdiutil` errors:
- Use `TMPDIR=/tmp` for packaging (already in scripts).
- Use `pnpm run package:dir` to validate packaging without DMG.
- If the machine is low on free disk space, the packaging preflight first removes stale generated outputs in `apps/editor/dist/release`, then fails before the long build/sign path and tells you to clean `~/Library/Caches/electron-builder` if space is still too low.

### Native dependency issues (node-pty)
If terminal fails in packaged builds:
```bash
pnpm run postinstall
```
Confirm `asarUnpack` includes `node-pty`.

## Historical Lessons
- Do not assume renderer assets exist under `app.asar/renderer/public` in packaged builds.
- Always guard icon loading so a missing file does not prevent `BrowserWindow` creation.
- Keep runtime logs enabled in packaged builds to avoid silent blank screens.
- Set `vite` base to `./` for file:// loading in production builds.
