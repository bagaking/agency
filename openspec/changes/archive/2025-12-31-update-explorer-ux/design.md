## Context
Explorer currently loads and renders full directory trees and performs full status scans, which can become slow on large repos or many Cells. UX controls are limited compared to IDEs.

## Goals / Non-Goals
- Goals:
  - Keep Explorer fast for large repos (virtualized rows, incremental refresh).
  - Provide IDE-grade navigation and visibility controls.
  - Reduce status computation overhead with caching and throttling.
- Non-Goals:
  - No cross-platform file watching beyond macOS in v0.2.
  - No collaborative multi-user sync.

## Decisions
- Decision: Use virtualized rendering (react-window or similar) for tree rows.
- Decision: File watching in main process, with debounced IPC updates to renderer.
- Decision: Filters are UI-only and do not mutate underlying git state.

## Risks / Trade-offs
- Virtualization complicates drag-and-drop and range selection.
- File watchers may be noisy; must debounce and coalesce updates.

## Migration Plan
- Phase 1: Add filters, keyboard navigation, and open/dirty indicators.
- Phase 2: Add virtualization and watcher-driven refresh.
- Phase 3: Add status caching and background refresh reporting.

## Open Questions
- Confirm preferred virtualization library (react-window vs custom).
