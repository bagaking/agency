# Design: Agent-Centric Unified File Interaction System

## Context
`agency-editor` already supports rich Explorer operations, Session Map navigation, and Memo references, but these capabilities are currently defined as separate local behaviors. There is no single file-interaction model that guarantees consistent behavior and error handling across surfaces.

The project is agent-driven: file operations are not only editor conveniences but key workflow primitives for Cells, sessions, and memo workflows.

Current verified baseline:
- `explorer:import` exists and already implements copy import + conflict-safe rename.
- Explorer hook/UI performs many direct `window.agency` calls.
- No `file:interact` unified gateway yet.
- No CLI/tool adapter over one intent contract yet.

## Goals
- Provide one shared file interaction contract for Explorer, Agent Cells, Session Map, and Memo.
- Preserve Explorer as the canonical filesystem operation hub.
- Add first-class semantics for agent-specific files with built-in defaults and project extension.
- Support lightweight cross-surface drag routing into Explorer import-copy behavior.
- Keep phase 1 scope focused and implementable without destabilizing ongoing TS migration.
- Keep Explorer capabilities tool-ready so Agent workflows can call them directly.
- Keep the architecture process-boundary ready so Agency runtime (or dedicated helper process) can perform controlled file intents in the future.

## Non-Goals
- Full CRUD file management in Session Map and Memo.
- Filesystem tree virtualization or semantic tree rewriting.
- Changes to lifecycle state semantics, HIL index model, or Action Sheet storage model.

## Decisions

### Decision: Core action model
A single intent model is used across surfaces:
- `open`
- `reveal`
- `import_copy`
- `move`
- `copy`
- `delete`

Each request carries `sourceSurface` and normalized target payload.

### Decision: Explorer remains execution hub
Explorer/electron services remain the execution authority for filesystem mutations. Other surfaces route through the same gateway rather than implementing direct filesystem writes.

### Decision: Agent file semantics = built-in + project extension
- Built-in defaults identify core agent files (including `Agency.md` and Spark conventions).
- Project rules live in `.agency/agent-files.yaml` and can add/override labels/icons/priority and matcher rules.
- Final tags are merged by priority with deterministic conflict resolution.

### Decision: Surface UX depth in phase 1
- Session Map and Memo add open/reveal entry points and lightweight drag routing only.
- No full tree operations in those surfaces during phase 1.

### Decision: Tool-first packaging for Explorer capabilities
- Unified file intents are exposed as stable tool-capable interfaces, not just component-local handlers.
- Tool calls use the same gateway/result model as UI-triggered calls.

### Decision: Suggestion 1 is selected (Gateway First)
- Build `file:interact` first, then migrate Explorer to use it.
- Tool/CLI-facing entry points are thin adapters over the same gateway.
- Explorer must not keep a privileged private mutation path once gateway migration is complete.

### Decision: Process-boundary readiness
- File interaction gateway is designed so callers can be:
  - renderer UI
  - in-process agent orchestration
  - future dedicated Agency helper process
- All callers must pass through the same validation, permissions, and audit pipeline.

## Core Models

### FileTarget
```ts
{
  rootPath: string;
  relativePath: string;
  sourceSurface: 'explorer' | 'agent-cells' | 'session-map' | 'memo';
}
```

### FileIntent
```ts
'open' | 'reveal' | 'import_copy' | 'move' | 'copy' | 'delete'
```

### FileIntentResult
```ts
{
  success: boolean;
  intent: string;
  affectedPaths: string[];
  warnings: Array<{ code: string; message: string }>;
  failures: Array<{ code: string; message: string; path?: string }>;
  data?: unknown;
}
```

### FileSemanticTag
```ts
{
  id: string;
  label: string;
  icon?: string;
  priority: number;
  matcherType: 'glob' | 'regex';
  matcherExpr: string;
}
```

## Architecture

### Renderer
- Add `fileInteraction` service (`apps/editor/renderer/src/services/fileInteraction.ts`) to normalize request/response contracts.
- Surfaces call the same service for open/reveal/import intent operations.
- Standardize message rendering via shared error/result mapping.

### Preload + IPC
- Add preload bridge methods:
  - `performFileIntent(payload)`
  - `classifyAgentFiles(payload)`
- Add IPC channels:
  - `file:interact`
  - `file:semantic:classify`

### Tool Gateway and Process Boundary
- Add a tool-facing adapter layer over unified file intents so Agent workflows can call Explorer-grade operations without re-implementing file logic.
- Keep call metadata (`sourceSurface`, `callerType`, `callerId`, trace id) in request context for policy and auditing.
- Design transport abstraction so tool calls can later come from a dedicated process channel while preserving current IPC contracts.
- Keep request/response schema CLI-friendly (single JSON payload in, single JSON result out), so a future CLI command can be a direct wrapper.

### Process-Boundary Compatibility Plan (Phase C Guardrail)
1. Freeze the wire contract at the existing `FileIntentPayload`/`FileIntentResult` JSON shape, including caller metadata and failure codes.
2. Keep renderer callers (Explorer/Agent Cells/Session Map/Memo) bound to `runFileIntent` and `runToolFileIntent` only, so transport can swap behind the same API.
3. Introduce a process adapter seam at Electron main (`file:interact` handler boundary) where calls can be forwarded to a helper process without payload remapping.
4. Preserve auth semantics (`callerId`, `traceId`, capability scopes) in the gateway before any helper-process dispatch to avoid trust inversion.
5. Keep CLI wrappers as thin JSON pass-through clients; helper-process migration must not require new CLI flags or schema forks.
6. Define parity checks for migration readiness: same success/failure payload, same `affectedPaths`, same conflict behavior, same permission-denied outcomes.

### Electron service
- Reuse explorer path safety and copy/move conflict logic.
- Add semantic classification loader:
  - built-in rules
  - optional `.agency/agent-files.yaml`
  - merged output for queried paths

## Data Flow
1. Surface emits normalized intent request.
2. Renderer `fileInteraction.perform` validates/normalizes and invokes preload.
3. IPC `file:interact` routes to service.
4. Service executes action with existing safety checks and returns `FileIntentResult`.
5. Renderer updates UX state (selection/reveal/refresh) and consistent message UI.

Classification flow:
1. Surface requests semantic tags for visible paths.
2. IPC loads built-in + project rules and returns per-path tags.
3. Explorer displays tags and semantic filters.

## Error Model
- `UserError`: invalid target, unsupported action in context, path missing.
- `Recoverable`: partial import failures, conflict-renamed outcomes.
- `Fatal`: IPC/service internal failures.
- `PermissionDenied`: caller is not authorized for the requested file intent/capability.

All surfaces consume a unified error structure and avoid custom ad-hoc string handling.

## Rollout Plan
- Phase A: Contract + Explorer wiring + regression tests.
  - A1: Introduce gateway and adapter (`file:interact` + preload/bridge).
  - A2: Route Explorer operations through gateway without behavior regression.
- Phase B: Agent Cells / Session Map / Memo entry-point routing.
- Phase C: Semantic tags, filtering, and quick-locate affordances.

## Risks and Trade-offs
- Routing centralization adds an abstraction layer but prevents long-term behavior drift.
- Classification adds overhead, mitigated with per-root caching and incremental refresh.
- Multi-surface convergence may reveal existing assumptions; phased rollout isolates risk.
- Tool/process enablement increases security surface; mitigate with capability scopes, deny-by-default policy, and auditability.

## Acceptance Criteria
- Same intent from different surfaces yields equivalent result schema and error semantics.
- Session Map and Memo can open/reveal files and route lightweight drops into Explorer import flow.
- Explorer renders semantic tags for built-in and project-defined agent file rules.
- No regressions in current Explorer copy/move/import safety and selection behaviors.
- Agent-invoked tool calls use the same gateway and produce equivalent result/error semantics as UI calls.
- Gateway contracts remain usable if caller is moved from renderer-side orchestration to a dedicated process.
