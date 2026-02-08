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
   core mutation/reveal flows already route through `fileInteraction`.
3. Agent semantic rules are active:
   built-in rules and `.agency/agent-files.yaml` project rules are loaded and merged for classification.
4. Explorer semantic affordance is partially landed:
   row tags + semantic filtering are available; semantic quick-locate still pending.
5. Cross-surface parity remains pending:
   Agent Cells / Session Map / Memo still need full open/reveal + drag-routing convergence on the unified contract.
