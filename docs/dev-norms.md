---
title: Development Norms
required: true
sop:
  - Read docs/guidebook.md before working.
  - Use pnpm for workspace dependencies and keep pnpm-lock.yaml committed.
  - Renderer IPC must go through apps/editor/renderer/src/services/agencyBridge.js.
  - Avoid direct window.agency usage in React components.
  - When changing voice input, rescore behavior, or language handling, update docs/voice-input-notes.md.
  - Keep code DRY and SOLID; refactor files over 800 lines.
  - Verify preload and IPC injection health; surface a minimal status indicator if missing.
---

# Development Norms

This document collects core engineering norms that must stay aligned with project behavior.

## Docs Hygiene
- When changing voice input, rescore behavior, or language handling, update `docs/voice-input-notes.md` accordingly so new contributors can follow the latest flow.

## Quality
- Keep the architecture clean and favor DRY and SOLID; refactor when a file exceeds 800 lines.

## Electron IPC/Preload Health
- Treat `preload` + IPC injection as a required runtime dependency.
- Always verify `window.agency` is available before invoking IPC from the renderer.
- If IPC/preload is missing or fails, surface a minimal status bar indicator (e.g. red state + short label) and log the failure for debugging. Avoid hard-blocking user flows unless required.
- When adding new renderer actions, ensure a safe fallback path or a clear error message in logs.

## Renderer IPC Access
- Centralize renderer-main IPC calls in `apps/editor/renderer/src/services/agencyBridge.js`.
- Avoid direct `window.agency` usage in React components; route through the bridge for consistency and easier testing.
