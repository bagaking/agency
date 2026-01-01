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

Unpacked build (skip DMG):
```bash
pnpm run package:dir
```

Artifacts:
- `apps/editor/dist/release/Agency-<version>-arm64.dmg`
- `apps/editor/dist/release/Agency-<version>-arm64-mac.zip`
- `apps/editor/dist/release/mac-arm64/Agency.app`

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
