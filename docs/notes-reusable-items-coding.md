---
title: Reusable Items - Coding (Catalog)
required: false
sop:
  - Update this list when you introduce or adopt a new reusable component/library/mechanism.
  - When you remove or deprecate something, update this list and point to the replacement or migration.
  - Regenerate `docs/must-sop.md` after SOP/frontmatter changes.
---

# Reusable Items - Coding (Catalog)

This is a project-local catalog of reusable engineering assets. The goal is discoverability and convergence.

## Reusable Components
| Item | Must/Nice | When to Use | Source of Truth |
| --- | --- | --- | --- |
| `SessionMenus` | MUST | Session-related action menus; avoid one-off menu markup. | `apps/editor/renderer/src/components/SessionMenus.tsx` |
| `AvatarPickerMenu` | MUST | Avatar selection UI with recents/active handling. | `apps/editor/renderer/src/components/ui/AvatarPickerMenu.tsx` |
| `AgentAvatarBadge` | MUST | Avatar rendering with idle/closed rings; use for all avatar displays. | `apps/editor/renderer/src/components/ui/AgentAvatarBadge.tsx` |
| `FileDashboardList` | SHOULD | Render Agent Cells + Explorer changed-files dashboards with Flat/Tree, open/reveal/preview, and drag-start affordances. | `apps/editor/renderer/src/components/fileDashboard/FileDashboardList.tsx` |

## Reusable Libraries / Packages
| Item | Must/Nice | When to Use | Source of Truth |
| --- | --- | --- | --- |
| `@xterm/xterm` | MUST | Terminal rendering; avoid mixing other terminal widgets. | `apps/editor/renderer/src/components/TerminalPane.tsx` |
| `lucide-react` | MUST | Icon set for UI consistency; avoid other icon packs. | `apps/editor/renderer/src/components` |
| `@bagakit/open-agent-avatars` | MUST | Avatar asset source; no external fallbacks. | `apps/editor/renderer/src/utils/agentAvatar.ts` |

## Reusable Mechanisms
| Item | Must/Nice | When to Use | Source of Truth |
| --- | --- | --- | --- |
| Renderer IPC via `agencyBridge` | MUST | All renderer → main IPC calls. | `apps/editor/renderer/src/services/agencyBridge.ts` |
| Modal system (`ModalProvider` / `useModal`) | SHOULD | Standard confirm/notice modals; for custom-form content set `showActions: false` + close via `closeModal(id, ...)`. | `apps/editor/renderer/src/components/modals/ModalSystem.tsx` |
| Unified file intent gateway (`runFileIntent` / `runToolFileIntent`) | MUST | Any Explorer/Agent Cells/Session Map/Memo file interaction should call unified intent wrappers instead of direct per-channel `window.agency` calls. | `apps/editor/renderer/src/services/fileInteraction.ts`, `apps/editor/electron/services/fileInteraction.ts` |
| Explorer performance pipeline (in-flight directory dedupe + incremental semantic classify + memoized filter matching) | SHOULD | Large repo Explorer interactions to reduce repeated IO/classification/filter recursion and prevent UI stalls. | `apps/editor/renderer/src/hooks/useProjectExplorer.ts`, `apps/editor/renderer/src/components/explorer/ProjectExplorerSidebar.tsx` |
| Workbench disk-sync decision helpers (`resolveExternalReloadStrategy`, `isPathPossiblyChanged`) | SHOULD | Active workbench tabs that need safe external-file refresh behavior (auto-reload clean tabs, warn on dirty conflicts) without coupling UI logic to raw mtime/path heuristics. | `apps/editor/renderer/src/utils/workbenchDiskSync.ts`, `apps/editor/renderer/src/components/workbench/WorkbenchPane.tsx` |
| File reference extraction + normalization (`extractFileReferences`, `resolveFileReferenceTarget`) | MUST | Parse terminal/preview/reference text into root-safe file shortcuts for Session Map and Memo open/reveal + drag-routing flows. | `apps/editor/renderer/src/utils/fileReferences.ts` |
| Unified file drag payload helper (`setFileDragPayload`) | MUST | Emit consistent `text/plain` absolute-path drag payloads across Agent Cells / Session Map / Memo so Explorer drop routing keeps `import_copy` semantics. | `apps/editor/renderer/src/utils/fileDragPayload.ts` |
| Agent Cells file-change aggregation (`buildAgentCellFileChanges`) | SHOULD | Build scoped file-change dashboard entries from session preview caches with deterministic ranking/dedupe. | `apps/editor/renderer/src/utils/agentCellFileChanges.ts` |
| Scoped settings state hook | MUST | Any Global/Project/Agent settings editor; reuse dirty/error/saving/IPC guard state machine. | `apps/editor/renderer/src/hooks/shared/scopedSettingsState.ts` |
| Session naming core engine | MUST | Session naming rule parsing/placeholder formatting across main and renderer. | `apps/editor/shared/sessionNamingCore.cjs` |
| Path safety helpers | MUST | Normalize relative paths and enforce root-safe resolution in Electron services/preload. | `apps/editor/electron/services/shared/pathSafety.ts` |
| Electron compiled entry pipeline | MUST | Any Electron main/preload TS migration should launch compiled `.electron-build/main.js` through the shared `build:electron` pipeline for dev/test/package consistency. | `apps/editor/package.json`, `apps/editor/scripts/build-electron.ts`, `apps/editor/scripts/dev-main.ts`, `apps/editor/scripts/run-e2e.ts`, `apps/editor/tsconfig.electron.json` |
| IPC setup registration pipeline | MUST | Register Electron IPC handlers through ordered `IPC_REGISTRATIONS` helpers (`withMainWindow` / `withoutDeps`) to keep behavior parity while reducing repetitive boilerplate. | `apps/editor/electron/main/ipcSetup.ts` |
| Electron service TS module layer | MUST | Keep main-process service logic in TypeScript modules with named exports; use `// @ts-nocheck` only as transitional guard until strict typing pass. | `apps/editor/electron/services/**/*.ts`, `apps/editor/electron/windows/captureOverlay/*.ts` |
| Terminus launch action builder | SHOULD | Build unified Start/Resume/Subcommand session-create actions from profile config (menu + dispatch paths). | `apps/editor/renderer/src/utils/terminusSettings.ts` |
| Session map model builder | MUST | Session map clustering/statistics. | `apps/editor/renderer/src/utils/sessionMapModel.ts` |
| Time formatting helpers | MUST | Relative/idle time display. | `apps/editor/renderer/src/utils/timeFormat.ts` |
| Avatar resolution & rotation | MUST | Stable avatar mapping + least-used selection. | `apps/editor/renderer/src/utils/agentAvatar.ts` |
| Debug flags (`DEBUG_FLAGS`) | MUST | Dev-only debug toggles for UI/IPC flows; avoid ad-hoc localStorage keys. | `apps/editor/renderer/src/utils/debugFlags.ts` |
| Session preview memory cache | MUST | Hover preview warmup + memory-first rendering; avoids disk on first hover. | `apps/editor/renderer/src/services/sessionMapPreviewCache.ts` |
| Session runtime helper module | MUST | Share session key/filter/activity/font/terminal-text helper logic across hooks and TS migration seams. | `apps/editor/renderer/src/hooks/shared/sessionRuntime.ts` |
| Voice runtime helper module | MUST | Share language normalization, speech error mapping, permission-kind classification, and SpeechRecognition detection logic. | `apps/editor/renderer/src/hooks/shared/voiceRuntime.ts` |
| Session Reply Relay | MUST | Session-side reply capture, routing, and asset storage for cross-agent comms. | `apps/editor/renderer/src/components/SessionReplyPanel.tsx` |


## High-Leverage Modules (Refactor Queue)
| Module | Why High Leverage | Reuse Target | Status |
| --- | --- | --- | --- |
| `useSessions` | Owns session lifecycle, active state, command dispatch, and activity bookkeeping; changes impact most terminal workflows. | Split into reusable `sessionStore`/`sessionCommands`/`sessionActivity` primitives before TS conversion. | Completed (runtime helpers extracted + hook migrated to TS) |
| `useVoiceCapture` | Encapsulates native/browser capture orchestration, permission flow, interim/final handling, and error recovery. | Split into reusable voice adapter + state machine hooks with shared diagnostics helpers. | Completed (runtime helpers extracted + hook migrated to TS) |
| `AppLayout` | Coordinates sidebar/main-panel/HIL rendering and all major feature views, so regressions have broad UI blast radius. | Keep `AppLayout` as orchestration shell and compose `AppSidebarContent`/`AppMainPanels`/`AppHilPanel`. | Completed (AppLayout shell + layout modules migrated to TSX) |
| `TerminalPane` | Centralizes xterm attach/input/selection/path-link behavior and preview signaling; very broad blast radius. | Extract terminal interaction controller and keep pane component focused on rendering. | Completed (runtime effect extracted to `useTerminalRuntimeEffect`) |
| `App.tsx` | Cross-domain orchestration and wiring hub; currently too wide for safe typed migration in one step. | Incrementally isolate feature composition boundaries into reusable orchestration hooks. | Completed (TSX migration complete with extracted composition seams) |

## JS/CJS Compatibility Exceptions
| File | Why It Remains JS/CJS | Exit Condition |
| --- | --- | --- |
| `apps/editor/scripts/after-pack.js` | Electron Builder `afterPack` hook resolves a plain JS file path from package metadata. | Migrate to a validated TS/compiled hook contract in packaging pipeline. |
| `apps/editor/scripts/cli_stub.js` | Terminal runtime injects this exact script path for CLI stub behavior in test/dev sessions. | Replace with a compiled-entry indirection that preserves path compatibility. |
| `apps/editor/postcss.config.js` | Current PostCSS toolchain auto-load path expects JS config in this workspace setup. | Adopt and verify a TS-aware PostCSS config loader. |
| `apps/editor/shared/sessionNamingCore.cjs` | Shared CJS contract is consumed by both Electron (CJS) and renderer/runtime callsites during migration. | Move both callsites to a single TS/ESM core module without interop regressions. |

## Deprecations
- None currently.
