# Change: Update renderer port discovery

## Why
The current dev renderer assumes port 5173, which frequently collides. The app should discover the actual dev server port and avoid hard-coded defaults, including for packaged runs that target a local dev server.

## What Changes
- Remove hard-coded 5173 usage in dev scripts and tests.
- Introduce dev renderer port discovery with a non-5173 default and auto-fallback to a free port.
- Allow packaged builds to target a dev renderer URL when explicitly configured.

## Impact
- Affected specs: agency-editor
- Affected code: dev scripts, Electron renderer loading, Playwright config, dev server bootstrapping
