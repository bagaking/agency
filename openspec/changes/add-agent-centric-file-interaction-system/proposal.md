# Change: Add Agent-Centric Unified File Interaction System

## Why
The current `agency-editor` has strong point solutions in Explorer, but lacks a unified cross-surface file interaction contract across Explorer, Agent Cells, Session Map, and Memo.

This causes three recurring problems:
- File entry and action semantics differ by surface, increasing user confusion and implementation duplication.
- Agent-specific files (for example `Agency.md`, Spark conventions, and custom agent files) lack a first-class discovery and classification model.
- New features increasingly re-implement file interaction paths without shared constraints for errors, conflict handling, and observability.

## What Changes
1. Define a unified file interaction contract shared by Explorer, Agent Cells, Session Map, and Memo.
2. Introduce an agent file semantics registry with built-in defaults and project-level extension rules.
3. Add cross-surface file entry points (open/reveal) and lightweight drag routing into Explorer import-copy flow.
4. Extend Explorer requirements from tree-only interactions to system-level interaction hub semantics.
5. Standardize result and error semantics for file operations across surfaces.
6. Emphasize Explorer capabilities as tool-capable interfaces that can be invoked by Agent workflows.
7. Reserve a process-boundary design path so Agency runtime (or a dedicated helper process) can call file interaction capabilities for inter-agency and filesystem workflows.

## Current Baseline (Verified from Code)
- Explorer already supports core file operations and external import via `explorer:import`, with copy semantics and conflict-safe naming.
- Renderer Explorer logic still calls many `window.agency.*` APIs directly instead of a single contract service.
- There is no unified IPC gateway (`file:interact`) yet, and no tool/CLI-friendly adapter over one canonical intent schema.
- Existing implementation quality is usable, but cross-surface and agent/tool reuse is not contract-locked yet.

## Execution Strategy (Locked)
- Adopt **gateway-first** implementation:
  1) Introduce `file:interact` and normalized result schema.
  2) Migrate Explorer to call this gateway first (no behavior regression).
  3) Expose tool-facing adapter and CLI-friendly payload/response contract as thin wrappers over the same gateway.

## Non-Goals
- Do not add full file-management CRUD (rename/move/delete tree operations) inside Session Map or Memo in phase 1.
- Do not virtualize or restructure the filesystem tree into synthetic directories.
- Do not change worktree lifecycle semantics or HIL storage architecture.

## Impact
- Affected specs: `agency-editor`
- Affected code (planned):
  - `apps/editor/renderer/src/services/fileInteraction.ts` (new)
  - `apps/editor/renderer/src/components/explorer/*`
  - `apps/editor/renderer/src/components/sessionMap/*`
  - `apps/editor/renderer/src/components/hil/*`
  - `apps/editor/electron/ipc/handlers/*` (file interaction entry)
  - `apps/editor/electron/services/explorer.ts` (classification + intent routing)
  - `apps/editor/electron/preload.ts`
- Config additions (planned): `.agency/agent-files.yaml`
- Risk:
  - Cross-surface event routing conflicts
  - Classification performance regression in large repos
  - Contract churn during Electron TS migration
  - Tool exposure and process-boundary expansion can introduce permission/security mistakes
- Mitigation:
  - Introduce a single `FileIntent` gateway and strict source-surface metadata
  - Use incremental classification/cache and bounded refresh
  - Freeze contract schema before broad wiring
  - Add capability-scoped permission checks and audit logging for tool-invoked file intents
