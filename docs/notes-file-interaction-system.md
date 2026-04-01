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

Symlink handling sharpens the meaning of "safe by default":
- lexical path normalization is necessary but not sufficient;
- any capability that reads file content, traverses directories, or chooses a mutation destination must distinguish between the link object and the resolved target path;
- deleting or renaming a symlink entry can remain a repo-local lexical operation, but reading through a symlink or writing through a symlinked parent must still honor the real workspace boundary.

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

Clipboard routing follows the same rule:
- ordinary Explorer file copy should publish real file references into the system clipboard when the host supports that capability;
- Explorer may keep Explorer-owned clipboard metadata so same-root paste can preserve copy/cut intent instead of degrading into a generic import;
- same-root Explorer clipboard metadata gets first refusal on paste, then generic system clipboard file/image import, then any local fallback state.

## Current Program of Work
- Authoritative change:
  `openspec/changes/archive/2026-02-10-add-agent-centric-file-interaction-system/`
- Follow-up evolution (delivered):
  `openspec/changes/archive/2026-02-16-update-agent-cells-embedded-explorer/`
- This note is the project-level philosophy mirror.
- OpenSpec files carry implementation-level requirements and task breakdown.

## Follow-up Evolution (Delivered)
- Change: `openspec/changes/archive/2026-02-16-update-agent-cells-embedded-explorer/`
- Status: Delivered. This section summarizes the shipped behavior that completed the follow-up slice.
- Shipped behaviors:
  - Agent Cells Explorer panel is now bottom-anchored to align with the Agent-context layout style;
  - the panel collapses into a bottom bar, expands to a default half-height, and supports drag-resize;
  - file list semantics are explicit and Cell/worktree scoped (`Changes` + `All` from Explorer+git data; no session-level file attribution);
  - the panel supports a `Changes` vs `All` toggle (with ignore-aware changes filtering and truncation hint for all-files limit);
  - open/reveal continue to route through unified file intents, and panel-level drop-in import now uses `import_copy`.

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
   Agent Cells sidebar now exposes a Cell/worktree-scoped file-change dashboard with open/reveal actions and quick drag entry points.
7. Lightweight drop routing is now unified:
   Agent Cells, Session Map, and Memo reference chips all use the same `text/plain` absolute-path drag payload helper so Explorer drop handling stays on `import_copy` semantics.
8. Tool-intent governance baseline is active:
   `file:tool:interact` now requires caller metadata (`callerId`, `traceId`) and capability-scoped authorization (`file.read` / `file.write`).
9. CLI wrapper baseline is active:
   `fileIntentCli` provides JSON-in / JSON-out access to `file:interact` semantics (user/tool/classify modes) as a thin gateway wrapper.
10. Regression coverage has expanded:
   Electron service tests validate intent normalization + cross-surface open/reveal parity + semantic-rule merge priority + permission outcomes; renderer utility tests now cover Agent Cells file-change aggregation and unified drag payload formatting.
11. Baseline validation was re-run:
   `typecheck:renderer`, `typecheck:electron`, targeted node-test suites, and the current Playwright e2e baseline were executed; existing unrelated e2e failures remain, while external-drop scenarios continue to pass.
12. Workbench breadcrumbs now expose per-segment reveal actions:
   each directory/file segment requests in-app Explorer tree reveal (expand + select) so editor/tree stay synchronized without triggering OS Finder reveal.
13. Explorer dispatch UX was consolidated:
   the active-session card and selection instruction composer now share one integrated footer card, and the instruction textarea auto-grows while typing for larger context input.
14. Agent Cells file-access UX now matches Explorer + Agent-context semantics:
   sidebar Explorer panel is bottom-anchored, supports Cell/worktree `Changes`/`All` views, keeps Flat/Tree modes, and supports open/reveal + drop-import parity.
15. Explorer performance/stability guardrails were strengthened:
   root tree listing is no longer blocked by status fetch, directory loads dedupe in-flight requests, semantic classification runs incrementally, tree filter matching caches per-pass decisions, and git status collection is bounded by timeout + concurrency.
16. Workbench active-tab disk sync is now proactive:
   active tabs periodically/stat-on-focus check disk mtime, auto-reload when no unsaved edits exist, and surface a reload warning when local unsaved edits conflict with newer disk content.
17. Explorer sidebar now includes a companion changed-files panel above the Agent footer:
   this panel mirrors Agent Cells file-dashboard row/tree affordances (open/reveal/preview + drag payload), remains changes-only (no scope toggle), and preserves cross-view visual continuity.
18. Bounded web research now stays inside existing Agency seams:
   Explorer owns URL intake and launch, Workbench owns the bounded web research tab, `View` is hosted as a true native browser surface instead of a renderer iframe, reader previews save through the workbench file-writing path, saved Markdown files carry fixed `agency_source_*` frontmatter so Workbench can reopen them in markdown + preview mode, memo citations reuse HIL memo artifacts, in-view navigation stays constrained to the same public-URL policy as Explorer intake, and saved files hand back into standard Explorer/workbench open/reveal flows instead of creating a browser-local intake path while keeping cookies/session management and general browser tabs out of scope.
19. Realpath-backed workspace boundaries are now part of the shared file contract:
   existing-path reads/searches and mutation-target parent resolution distinguish lexical repo paths from resolved filesystem targets, so symlink entries can stay visible while repo-external targets remain non-traversable and non-mutable through Explorer/Workbench surfaces.
20. Explorer clipboard now distinguishes three layers explicitly:
   - Explorer-owned selection state for same-root copy/cut semantics;
   - generic OS file/image clipboard payloads for import/copy semantics;
   - text-only clipboard utilities such as `Copy Path`.
   The product should prefer the Explorer-owned payload when it belongs to the current root, fall back to OS import semantics otherwise, and only keep an internal fallback clipboard when system file-reference writing is unavailable or fails.

## Process-Boundary Compatibility Plan (Locked)
- Keep `FileIntentPayload`/`FileIntentResult` as the stable wire format across renderer, tool, CLI, and future helper process callers.
- Keep surface calls pinned to `runFileIntent` / `runToolFileIntent`; transport changes happen behind those wrappers.
- Add migration seam at `file:interact` handler boundary (Electron main) so helper process forwarding does not alter callers.
- Preserve caller metadata and capability checks before any cross-process dispatch.
- Require parity checks (`affectedPaths`, failure codes/messages, conflict behavior, permission-denied semantics) before enabling helper-process execution.
