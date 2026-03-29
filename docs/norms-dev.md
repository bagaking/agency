---
title: Development Norms
required: true
sop:
  - Read docs/must-guidebook.md before working.
  - Use pnpm for workspace dependencies and keep pnpm-lock.yaml committed.
  - Keep repo-authored source in governed roots (`apps/`, `pkg/`, `scripts/`) TypeScript-only; do not add checked-in `.js`/`.cjs`/`.mjs` there.
- Renderer IPC must go through apps/editor/renderer/src/services/agencyBridge.ts.
- Avoid direct window.agency usage in React components.
- For external/local automation, prefer the unified local control bus over adding one-off CLI wrappers or bespoke socket contracts around existing host capability owners.
- When changing voice input, rescore behavior, or language handling, update docs/notes-voice-input.md.
  - Keep code DRY and SOLID; refactor files over 800 lines.
  - Verify preload and IPC injection health; surface a minimal status indicator if missing.
directives:
  - DEBUG: When debugging, include a final-response attempt summary using `<问题>: 尝试 <次数> - <一句话描述方法>` (7 Chinese characters), and note the inbox record.
---

# Development Norms

This document collects core engineering norms that must stay aligned with project behavior.

## Docs Hygiene
- When changing voice input, rescore behavior, or language handling, update `docs/notes-voice-input.md` accordingly so new contributors can follow the latest flow.

## Quality
- Keep the architecture clean and favor DRY and SOLID; refactor when a file exceeds 800 lines.
- Repo-authored source under `apps/`, `pkg/`, and `scripts/` is TypeScript-only. Generated output and vendored code are excluded, but checked-in JS/CJS/MJS is not allowed in those governed roots.
- Heavy renderer surfaces must defer cost until intent. If a surface is hidden by default or backed by a heavyweight runtime, do not mount/load it eagerly in the shell just because the app launched.
- Prefer shared deferred mechanisms over feature-local tricks. Use the project’s shared wrappers for deferred mount / lazy runtime loading instead of reintroducing ad-hoc `hasMounted`, inline dynamic-import branches, or duplicate suspense shells.
- Non-primary renderer views and drawers should load through explicit lazy boundaries. If a screen, sidebar, or HIL panel is not part of the default boot path, do not keep it in the main renderer chunk by static import convenience alone.
- Renderer build output must stay inside the shared bundle budget guardrail. Run `pnpm -C apps/editor run check:renderer-bundle-budget` when changing lazy boundaries or heavyweight imports, and do not relax the default thresholds without recording why.
- For important UI/UX work, review the result against four bars before calling it done:
  - design quality: does the surface feel coherent instead of assembled from unrelated parts;
  - originality: does it reflect Agency-specific decisions instead of template or library-default structure;
  - craft: are typography, spacing, color, contrast, and state treatment consistently executed;
  - functionality: can users understand the current context and primary actions without guessing.
- If a user-facing surface fails one of those bars, keep refining hierarchy, identity, and interaction clarity instead of stopping at “works”.

## Debugging Protocol
- In the final response, output a compact attempt summary in the format: `<问题>: 尝试 <次数> - <一句话描述方法>`.
- `<问题>` 必须是 7 个汉字，能概括该故障。
- 每次排障需在 `docs/.bagakit/inbox/` 留档，包含尝试次数、方法、反馈。
- 如果同一问题达到 2 次未解决，第 3 次必须换思路并补充更深诊断日志。

## Electron IPC/Preload Health
- Treat `preload` + IPC injection as a required runtime dependency.
- Always verify `window.agency` is available before invoking IPC from the renderer.
- If IPC/preload is missing or fails, surface a minimal status bar indicator (e.g. red state + short label) and log the failure for debugging. Avoid hard-blocking user flows unless required.
- When adding new renderer actions, ensure a safe fallback path or a clear error message in logs.

## Renderer IPC Access
- Centralize renderer-main IPC calls in `apps/editor/renderer/src/services/agencyBridge.ts`.
- Avoid direct `window.agency` usage in React components; route through the bridge for consistency and easier testing.
- Do not treat renderer preload IPC as the canonical external automation API. External/local automation should prefer the unified local control bus.

## Renderer Performance
- Closed heavyweight overlays should normally unmount instead of staying hidden-but-mounted unless there is a documented state-preservation reason.
- Non-primary panels may use “retain after first activation”, but the mount policy must live in a shared reusable mechanism rather than local component state.
- Monaco-backed surfaces must use the shared lazy Monaco wrapper; do not import `@monaco-editor/react` directly in feature components.
- Third-party runtimes with meaningful parse/init cost should be wrapped behind a project-owned component boundary so loading strategy can be evolved centrally.
