# Change: Refactor renderer UI architecture for typed screen composition

## Why
The renderer currently preserves product behavior, but its implementation structure has become a bottleneck. Top-level UI orchestration is overloaded, key screen contracts rely heavily on `any`, several renderer files exceed the project's refactor threshold, and interaction patterns still mix app-native flows with browser-native prompts.

Without a dedicated refactor change, future work on Explorer, Workbench, Agent Cells, HIL, and Session Map will continue to accumulate coupling and regression risk.

## What Changes
- Introduce typed screen composition contracts between `App.tsx`, layout builders, and feature panels.
- Split oversized renderer controllers, hooks, and view components by responsibility while preserving current user-visible behavior.
- Standardize shared in-app prompt/confirmation flows for destructive actions and text-entry interactions in core UI surfaces.
- Route privileged renderer-side preload access for capture/overlay flows through service abstractions instead of direct view-layer globals.
- Add targeted regression coverage for extracted layout/view-model builders and high-risk UI interaction paths.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/App.tsx`
  - `apps/editor/renderer/src/app/*`
  - `apps/editor/renderer/src/components/explorer/*`
  - `apps/editor/renderer/src/components/workbench/*`
  - `apps/editor/renderer/src/components/agentCells/*`
  - `apps/editor/renderer/src/components/hil/*`
  - `apps/editor/renderer/src/hooks/useSessions.ts`
  - `apps/editor/renderer/src/hooks/useProjectExplorer.ts`
  - `apps/editor/renderer/src/services/*`
- Risk:
  - Refactoring screen composition can silently break selection state, panel routing, modal flows, and persisted UI state.
- Mitigation:
  - Land the refactor in behavior-preserving slices, keep tests close to extracted contracts, and verify high-risk UI paths after each phase.
