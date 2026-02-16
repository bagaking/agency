# Design: Reuse-first decomposition of large renderer modules

## Context
The large renderer-file audit identified 10 files above 800 lines (3 above 1,500 lines), all in `renderer/src`.
Current issues are not only file length but mixed responsibilities and repeated logic.

High-impact findings:
- `App.tsx` is a monolithic composition root with cross-domain state orchestration.
- `AgentCellsSidebar.tsx` and `ProjectExplorerSidebar.tsx` duplicate external drop parsing and dashboard preview flows.
- `ProjectExplorerSidebar.tsx` also keeps clipboard/materialize runtime calls inline via `window.agency`.
- `useProjectExplorer.ts` and `useSessions.ts` still keep many direct runtime-global calls despite being core orchestration hooks.
- `TerminalPane.tsx` and `WorkbenchPane.tsx` contain heavy runtime/IPC logic inside UI components.
- `useTerminalRuntimeEffect.ts` is itself now a large runtime monolith after initial extraction from `TerminalPane.tsx`.
- `SessionReplyPanel.tsx` combines reply history data loading, prompt insertion, routing/send, and item mutation flows in one component.
- `HilMemoView.tsx` and `HilCommentsPanel.tsx` each mix multiple panels/components and mutation logic.
- `QuickActionsView.tsx` has one large component that combines profile and shortcut subdomains.

## Goals / Non-Goals
- Goals:
  - Reduce monolithic renderer files into clear domain modules.
  - Prioritize reusable extraction where logic is duplicated or likely to be reused.
  - Keep behavior and user-facing semantics unchanged.
  - Align renderer IPC usage to service-bridge patterns.
  - Document reusable outcomes in Bagakit coding catalog after completion.
- Non-Goals:
  - Product behavior redesign.
  - UI visual redesign.
  - Electron main-process architecture changes beyond adapter touchpoints.

## Decisions

### Decision 1: Reuse-first extraction order
For each target file, extract shared reusable units before local component splitting.
This prevents creating multiple similar private helpers in different files.

Priority reusable candidates:
- External drop-path parser utility (shared by Agent Cells + Explorer).
- File-dashboard preview loader hook (shared by Agent Cells + Explorer companion panel).
- File-snippet preview loader hook (shared by dashboard previews and HIL anchor hover previews).
- Renderer bridge adapters for terminal/workbench/HIL snippet flows.
- Renderer bridge adapters for Explorer clipboard/materialize helpers.
- Missing bridge adapters for `useProjectExplorer` / `useSessions` runtime operations.
- Shared HIL row-action primitives where behavior is identical.

### Decision 2: Domain-controller split for `App.tsx`
`App.tsx` will remain composition root only; domain orchestration moves into dedicated hooks/controllers with typed contracts.

Planned slices:
- project bootstrap + ui-state restore
- session map orchestration
- comment flow
- promote flow
- project/root switching lifecycle

### Decision 3: Bridge normalization
Large React components currently using `window.agency` directly will move to typed service wrappers under `renderer/src/services`.

Initial bridge normalization targets:
- terminal runtime operations and subscriptions
- workbench read/write/diff/blame/stat flows
- explorer clipboard/materialize paths
- HIL context snippet loading
- explorer root/status/list/watch paths used by `useProjectExplorer`
- session lifecycle paths used by `useSessions`
- bridge module composition (`services/agencyBridge.ts` -> domain-oriented adapters) when aggregate size approaches quality threshold

### Decision 4: File-by-file decomposition map
- `App.tsx` -> composition root + domain controllers/hooks.
- `AgentCellsSidebar.tsx` -> cell/session list panel + file-dashboard controller + shared drop util.
- `TerminalPane.tsx` -> lifecycle/resize/selection/keyboard/path-link sub-hooks + terminal bridge.
- `components/terminal/useTerminalRuntimeEffect.ts` -> runtime orchestration + focused utility hooks (resize, activity snapshots, selection arbitration, link activation).
- `ProjectExplorerSidebar.tsx` -> explorer actions hook + dnd/import hook + changed-files panel extraction.
- `HilMemoView.tsx` -> memo list/draft detail/audio button components + mutation hook.
- `HilCommentsPanel.tsx` -> comments panel vs promote modal split + tooltip/snippet hook.
- `WorkbenchPane.tsx` -> tab loading/disk sync/command hooks + workbench bridge.
- `QuickActionsView.tsx` -> profile card + shortcut binding card + shortcut capture hook.
- `SessionReplyPanel.tsx` -> reply composer + reply history list + cross-session routing/send modules.

### Decision 5: Reuse catalog synchronization
Every extracted reusable item (component/hook/mechanism) must be cataloged or updated in:
- `docs/notes-reusable-items-coding.md`

If an item is deprecated/replaced, the catalog entry must include replacement/migration notes.

## Risks / Trade-offs
- Risk: abstraction churn with too many tiny modules.
  - Mitigation: enforce feature-owned folders and minimum cohesion bar.
- Risk: hidden behavior changes while replacing runtime calls.
  - Mitigation: keep adapter APIs 1:1 with existing payloads and add regression checks per slice.
- Risk: duplicated temporary code during migration.
  - Mitigation: use a short-lived compatibility phase and remove old paths in the same change set.

## Migration Plan
1. Introduce shared reusable utilities/adapters without changing behavior.
2. Split one large file at a time, preserving external props/APIs.
3. Run typecheck/e2e/manual checks per slice.
4. Remove obsolete duplicate logic after each slice stabilizes.
5. Update reusable-items catalog docs to reflect extracted modules and ownership.

## Coordination / Sequencing (Avoid Merge Conflicts)
- Terminal: land `update-terminal-mouse-selection` (behavior lock-in) before deep refactors of `TerminalPane` / `useTerminalRuntimeEffect`.
- Reply: land `add-hierarchy-reply-quick-prompts` (prompt-source semantics) before refactoring `SessionReplyPanel`, or isolate prompt insertion first so later splits are mechanical.
- Explorer + Agent Cells: if `update-agent-cells-embedded-explorer` is in-flight, prefer shared-module extraction (drop parser, preview loader, bridge wrappers) first and postpone large file moves/renames until the UX change stabilizes.
- HIL promote entrypoints: coordinate `HilCommentsPanel` splits with any promote-flow changes to avoid churn around modal ownership and snippet/anchor UI.

## Open Questions
- Should we enforce a hard per-file soft cap (for example 600 or 800 lines) in CI for renderer only?
- Should `window.agency` direct access be lint-blocked in `renderer/src/components/**`?
