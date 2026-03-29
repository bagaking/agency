## Context
Agency already has substantial functionality, but the repo still lacks one canonical product object model.

Before this alignment, the language was split across multiple directions:
- the base spec used `Create Agent (Cell)` for worktree-bound workspace creation;
- the Harness direction treats `Create Agent` as the primary child-execution semantic;
- Commander is intentionally one bounded operator station, but it still competes with Session Reply and other surface nouns in the overall mental model;
- delivery, reply, and action-sheet flows are converging operationally, yet they are still easy to misread as competing execution concepts instead of artifacts bound to the same underlying objects.

This change is not primarily about implementation mechanics.
It is about defining the product contract that later implementation, docs, and UI copy should obey.

## Goals / Non-Goals
- Goals:
  - define one canonical Agency object hierarchy;
  - define a stable separation between objects, artifacts, surfaces, and actions;
  - eliminate the current `Create Agent` vocabulary collision;
  - give future changes a stable ownership model for notifications, control bus, browser/test surfaces, and session/run UX;
  - keep the model understandable to both users and future agents without hidden chat-context assumptions.
- Non-Goals:
  - do not immediately rename every file/component/module in the repo;
  - do not redesign the entire navigation shell in this change;
  - do not force product brands such as `Agent Cells` or `Commander` to disappear;
  - do not rewrite storage schemas unless needed to preserve the canonical ownership model.

## Decisions

### Decision: Separate four categories explicitly
Agency should stop letting one noun carry four jobs.

The product model should distinguish:
1. Canonical domain objects:
   - the durable things users operate on.
2. Workflow artifacts:
   - records, plans, and dispatch artifacts bound to those objects.
3. UI surfaces:
   - places where users view or act on objects and artifacts.
4. User-facing actions:
   - verbs that mutate or coordinate objects/artifacts.

This becomes the baseline test for future language:
- if a term is a surface label, do not let it become a storage owner;
- if a term is an action, do not reuse it as an object noun;
- if a term is a workflow artifact, do not present it as a sibling execution hierarchy.

### Decision: Canonical domain objects are App, Window, Project, Cell, Session, and Run
The canonical Agency object hierarchy should be:

1. `App`
- the desktop application instance;
- owns app-global settings and process-wide services.

2. `Window`
- one top-level shell;
- owns window-local project selection and window-local UI state;
- multiple windows may exist in one app instance.

3. `Project`
- the repository context selected inside a window;
- identified by repo root;
- hosts project-scoped config and the file/worktree universe visible to that window.

4. `Cell`
- a worktree-bound workspace inside a project;
- maps 1:1 to worktree + branch + lifecycle record;
- is the canonical workspace object for parallel development.

5. `Session`
- an execution lane inside one cell;
- belongs to exactly one cell;
- may have topology relationships to other sessions in the same cell.

6. `Run`
- a host-owned bounded orchestration record;
- may inspect, create, or target sessions through approved capabilities;
- is not the same object as a session, even when the run eventually creates or resumes one.

Key relationship rules:
- a window selects one project context at a time;
- a project may contain many cells;
- a cell may contain many sessions;
- a run is associated with a window owner and references project/cell/session context as needed;
- a run may produce session side effects, but it does not collapse into session identity.

### Decision: Workflow artifacts are first-class but not sibling object roots
The following should be treated as workflow artifacts rather than canonical domain objects:

- lifecycle records:
  - bound to a cell.
- gate definitions and gate evaluations:
  - scoped config and evaluation artifacts around cell lifecycle stages.
- Action Sheets:
  - workflow artifacts bound to a cell and optionally a session.
- HIL items, memos, replies:
  - artifact records with object references in metadata.
- delivery records:
  - dispatch artifacts linking source artifacts and target sessions.

This matters because the user should not have to guess whether a delivery run, reply item, or action sheet is a new execution hierarchy.
They are artifacts around canonical objects, not replacements for them.

### Decision: UI surfaces adapt canonical objects; they do not own them
Agency surface labels can remain product-specific, but they should be classified explicitly:

- `Agent Cells`:
  - primary surface for cell and session navigation/actions.
- `Explorer` and `Workbench`:
  - project/cell file surfaces.
- `Session Map`:
  - navigation and observability surface over cells, sessions, and runs.
- `Hierarchy`:
  - configuration surface, not an execution hierarchy.
- `Memo`:
  - artifact surface over HIL records.
- `Commander`:
  - bounded operator surface over current session/run evidence and approved actions.

Important rule:
- `Commander` is not a standalone domain object;
- `Agent Cells` is not the name of the underlying workspace object;
- `Hierarchy` is not a separate data hierarchy competing with the cell/session tree.

### Decision: Canonical action vocabulary must be one-to-one
Future UI copy and spec language should follow this vocabulary:

- `Create Cell`
  - create or reuse a worktree-bound workspace.
- `Create Session`
  - create an execution lane inside a cell.
- `Create Agent`
  - start bounded child execution as a run inside the current project/cell/session context.
- `Fork`
  - a specialized `Create Agent` strategy when true lineage semantics are available.
- `Reply`
  - create a session-bound communication artifact.
- `Send` / `Deliver`
  - dispatch text/payload/artifacts to a target session with tracked delivery state.
- `Promote`
  - convert captured or reviewed artifacts into delivery-ready execution input.
- `Gate Create` / `Gate Execute`
  - turn-level workflow helpers around cell merge readiness.

This resolves the current collision:
- `Create Agent (Cell)` becomes `Create Cell`;
- `Create Agent` becomes the child-execution semantic already implied by the Harness direction.

### Decision: Preserve product brands while clarifying their class
Some names should remain because they communicate product identity well:
- `Agent Cells`
- `Commander`
- `Session Map`

The fix is not to erase them.
The fix is to define their class clearly:
- brand/surface labels stay in UI;
- canonical object names stay in specs, runtime contracts, logs, and cross-surface ownership language.

### Decision: Treat this change as a prerequisite alignment layer for overlapping active changes
This change should align, not replace, the active product work already in flight.

Direct alignment targets:
- `add-main-agent-harness`
- `refactor-commander-unified-station`
- `update-window-instance-strategy`
- session runtime / delivery / reply docs

Rule:
- no new product-facing change should introduce a competing noun or overloaded action without mapping it into the canonical object model first.

## Canonical Crosswalk

| Current / drifting term | Canonical class | Canonical meaning |
| --- | --- | --- |
| `Create Agent (Cell)` | Action | Rename to `Create Cell` |
| `Create Cell` | Action | Create/reuse a worktree-bound workspace |
| `Create Agent` | Action | Start bounded child execution as a run |
| `Fork` | Action specialization | Specialized child-execution strategy |
| `Agent Cells` | Surface | Cell/session management UI |
| `Commander` | Surface/capability | Operator surface over session + run evidence |
| `Reply` | Artifact + action | Session-bound communication artifact and its authoring action |
| `Delivery` | Artifact/process | Dispatch record linking source artifacts to target sessions |
| `Action Sheet` | Artifact | Workflow plan/check artifact bound to cell/session |
| `Run` | Domain object | Host-owned orchestration identity, not a surface |

## Migration Plan

### Phase 1: Spec and doc alignment
- rename the base spec requirement to `Create Cell`;
- add canonical object hierarchy, surface-role, and artifact-ownership requirements;
- align active OpenSpec changes to the same noun/action crosswalk.

### Phase 2: Product copy audit
- audit create/fork/send/reply/promote labels across UI;
- remove mixed phrases that cause users to infer the wrong owner.

### Phase 3: Runtime contract alignment
- make object references explicit in logs, APIs, and run/session metadata;
- keep run identity separate from session identity everywhere.

### Phase 4: Future feature attachment
- require future attention-routing, browser/test surface, and control-bus proposals to declare which canonical objects they attach to.

## Risks / Trade-offs
- Risk: rename churn lands unevenly and increases short-term confusion.
  - Mitigation: keep one crosswalk table and migrate in phases.
- Risk: product brands become too abstract or architectural.
  - Mitigation: preserve brands in UI while clarifying object ownership under them.
- Risk: active changes continue using old nouns.
  - Mitigation: require alignment of overlapping active changes before implementation.

## Open Questions
- Should the user-facing create-workspace action be labeled only `Create Cell`, or keep transitional copy such as `Create Cell (Workspace)` for one release?
- Should `Project` be exposed directly as a canonical noun in more UI places, or remain mostly implied through project-root selection copy?
- Should `Run` become a more visible user-facing noun outside Session Map / Commander, or stay mostly behind operational surfaces?
