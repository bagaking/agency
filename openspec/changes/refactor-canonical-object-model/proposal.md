# Change: Refactor Agency Canonical Object Model

## Why
Agency's product language is drifting across specs, docs, and active changes.

The clearest conflict before this change was in the spec surface:
- the base spec used `Create Agent (Cell)` for worktree-bound workspace creation;
- the active Harness direction uses `Create Agent` as the primary semantic for bounded child execution;
- Commander, Reply, Delivery, Session Map, and Memo now span multiple object types, but the repo does not yet define one canonical distinction between:
  - domain objects;
  - workflow artifacts;
  - UI surfaces;
  - user-facing actions.

Without one canonical object model:
- future UI copy will keep drifting;
- future features such as attention routing, browser/test surfaces, or a unified control bus will attach to inconsistent ownership boundaries;
- users and future agents will keep having to infer whether a noun refers to a workspace, an execution lane, a host run, or only a surface label.

## What Changes
- Define one canonical Agency object hierarchy and relationship model.
- Separate four categories explicitly:
  - canonical domain objects;
  - workflow artifacts;
  - UI surfaces;
  - user-facing actions.
- Rename the current worktree-creation semantic from `Create Agent (Cell)` to `Create Cell`.
- Reserve `Create Agent` for bounded child execution owned by a host run.
- Keep `Fork` as a specialized child-execution strategy instead of the baseline product noun.
- Define ownership rules for `Reply`, `Delivery`, `Action Sheet`, `Commander`, and related surfaces so they stop reading like competing object hierarchies.
- Add a phased migration plan for:
  - OpenSpec language;
  - UI copy and menus;
  - runtime contracts and logs;
  - future changes that currently depend on ambiguous terms.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code and docs:
  - create-cell and child-session entrypoints
  - Main Agent Harness terminology and run presentation
  - Commander surfaces and session actions
  - Session Map / Agent Cells / Hierarchy / Memo copy
  - delivery, reply, and action-sheet documentation
  - future notification/control-bus/browser proposals that need stable ownership boundaries
- Risks:
  - broad rename churn could produce partial or mixed terminology during rollout;
  - over-correcting toward abstract architecture language could make the UI less legible;
  - active changes may continue to diverge if they are not aligned before implementation.
- Mitigation:
  - define a strict crosswalk first, then migrate incrementally;
  - keep product brands such as `Agent Cells` and `Commander` where useful, but classify them as surfaces rather than domain objects;
  - align active changes against the canonical vocabulary before implementation begins.
