---
title: Unified File Interaction System
required: false
sop:
  - Read this doc when changing Explorer, Agent Cells, Session Map, or Memo file interactions.
  - Update this doc when end-state goals, interaction contracts, or semantic-file rules change.
  - Regenerate docs/must-sop.md after updating this doc.
---

# Unified File Interaction System (Human + Agent)

This note defines the project-level design philosophy and end-state for file interactions across `agency-editor`.
It is the shared policy layer above local implementation details.

## Why This Exists
- The product is simultaneously human-facing and agent-driven.
- File operations are not just Explorer features; they are workflow primitives for Agent Cells, Session Map, and Memo.
- Without one contract, each surface drifts into custom behavior, duplicate code, and inconsistent failure handling.

## First-Principles Goals
1. Simultaneous success over trade-offs:
   keep core interaction capability complete across surfaces instead of sacrificing one for another.
2. One intent model:
   same user/agent intent must map to the same contract, result schema, and error semantics.
3. Safe by default:
   path validation, conflict handling, and permission checks are centralized.
4. Evolvable architecture:
   the same contract must stay valid when callers move from renderer UI to tool/agent processes.

## End-State Definition
1. Unified file intent contract:
   `open`, `reveal`, `import_copy`, `move`, `copy`, `delete`.
2. Explorer is the execution hub:
   filesystem mutations run through one gateway and one safety model.
3. Cross-surface parity:
   Agent Cells, Session Map, and Memo provide at least `open`/`reveal` and lightweight drop routing where applicable.
4. Agent semantic files are first-class:
   built-in recognition (`Agency.md`, Spark conventions) plus project extension rules.
5. Tool-ready capability packaging:
   Explorer-grade operations can be invoked as stable tools, not only UI handlers.
6. Process-boundary readiness:
   contracts remain stable if execution is moved to a dedicated Agency helper process.

## Surface Capability Model
- Explorer:
  full file interaction hub and canonical mutation entry.
- Agent Cells:
  context-aware open/reveal and workflow-friendly lightweight file entry.
- Session Map:
  file navigation shortcuts and lightweight drop routing, not full file management.
- Memo (Mamo):
  citation/reference open/reveal and lightweight routing, not full file management.

## Technical Selection Principles
1. Contract-first:
   freeze data shapes before broad wiring during TS migration.
2. Gateway-first migration:
   introduce `file:interact` first, then move Explorer to that gateway before expanding to other surfaces.
3. DRY interaction service:
   renderer surfaces call one `fileInteraction` service, not local `window.agency` code.
4. Typed result/error model:
   every action returns structured `success`, `affectedPaths`, `warnings`, `failures`.
5. Permission and audit metadata:
   include `sourceSurface`, `callerType`, `callerId`, and trace id for tool/process calls.
6. CLI/tool-friendly schema:
   keep request/response JSON-friendly so CLI wrappers and tool adapters stay thin over the same gateway.
7. Progressive rollout:
   Explorer baseline first, then cross-surface entry points, then semantic-file affordances.

## Current Program of Work
- Authoritative change:
  `openspec/changes/add-agent-centric-file-interaction-system/`
- This note is the project-level philosophy mirror.
- OpenSpec files carry implementation-level requirements and task breakdown.

## Implementation Snapshot (Current)
1. Gateway baseline landed:
   `file:interact`, `file:tool:interact`, and `file:semantic:classify` are available through preload + renderer service wrappers.
2. Explorer baseline migration is mostly done:
   mutation paths and user-triggered open entry points now route through `fileInteraction` intent mapping (`open`/`reveal`/`import_copy`/`move`/`copy`/`delete`/`create`/`rename`).
3. Agent semantic rules are active:
   built-in rules and `.agency/agent-files.yaml` project rules are loaded and merged for classification.
4. Explorer semantic affordance is landed:
   row tags + semantic filtering + semantic quick-locate are available.
5. Cross-surface routing has progressed:
   Memo (HIL comments + memo draft references), Session Map preview shortcuts, and Agent Cells dashboard shortcuts now open/reveal through unified file intents.
6. Agent Cells file-change dashboard baseline is landed:
   Agent Cells sidebar now exposes a scoped file-change dashboard (per selected worktree/session preview cache) with open/reveal actions and quick drag entry points.
7. Lightweight drop routing is now unified:
   Agent Cells, Session Map, and Memo reference chips all use the same `text/plain` absolute-path drag payload helper so Explorer drop handling stays on `import_copy` semantics.
8. Tool-intent governance baseline is active:
   `file:tool:interact` now requires caller metadata (`callerId`, `traceId`) and capability-scoped authorization (`file.read` / `file.write`).
9. CLI wrapper baseline is active:
   `fileIntentCli` provides JSON-in / JSON-out access to `file:interact` semantics (user/tool/classify modes) as a thin gateway wrapper.
10. Regression coverage has expanded:
   Electron service tests validate intent normalization + cross-surface intent parity + semantic-rule merge priority + permission outcomes; renderer utility tests now cover Agent Cells file-change aggregation and unified drag payload formatting.
11. Baseline validation was re-run:
   `typecheck:renderer`, `typecheck:electron`, targeted node-test suites, and the current Playwright e2e baseline were executed; existing unrelated e2e failures remain, while external-drop scenarios continue to pass.

## Process-Boundary Compatibility Plan (Locked)
- Keep `FileIntentPayload`/`FileIntentResult` as the stable wire format across renderer, tool, CLI, and future helper process callers.
- Keep surface calls pinned to `runFileIntent` / `runToolFileIntent`; transport changes happen behind those wrappers.
- Add migration seam at `file:interact` handler boundary (Electron main) so helper process forwarding does not alter callers.
- Preserve caller metadata and capability checks before any cross-process dispatch.
- Require parity checks (`affectedPaths`, failure codes/messages, conflict behavior, permission-denied semantics) before enabling helper-process execution.
