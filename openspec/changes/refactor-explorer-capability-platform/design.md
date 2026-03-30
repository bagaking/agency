## Context

Agency Explorer currently sits on top of a strong execution foundation:
- unified file intent gateway;
- project-aware semantic classification;
- modular renderer hooks for tree state, clipboard, mutation, and drag/drop;
- a growing file-scoped workflow handoff model.

What it lacks is not CRUD.

What it lacks is a stronger capability architecture for future growth. The next round of Explorer work should stop adding one-off product slices and instead define how new filter modes, commands, working sets, and browser-like research affordances attach to the surface.

This design uses three sources of truth:
- the current `agency-editor` spec;
- the new `docs/notes-explorer-interaction-system.md` research note;
- the repo’s product-quality bar in `AGENTS.md`.

## Goals

- Make Explorer extensible without rewriting the current execution layer.
- Turn built-in filters into the first entries of a registry-style model.
- Define search and replace as first-class workspace capabilities instead of treating them as UI afterthoughts.
- Turn hard-coded context menu/header actions into declared Explorer commands.
- Turn `Changed Files` into the first instance of a broader working-set family.
- Define a bounded URL/browser research lane that can accelerate file workflows without replacing the system browser.
- Produce an implementation roadmap that another engineer can execute phase by phase.

## Non-Goals

- Do not replace the current file intent gateway.
- Do not fully implement the browser lane in this planning change.
- Do not rewrite Explorer UI into a plugin system immediately.
- Do not change unrelated Session Map / Commander / Workbench architecture here.

## Decisions

### Decision: Keep the current file intent gateway as the execution substrate

Explorer already has the right substrate for future capability growth. New registries and views should call the existing gateway and related helper modules, not replace them.

This reduces risk and preserves parity with Agent Cells, Session Map, Memo, CLI, and future tool callers.

### Decision: Add a filter descriptor model before adding more feature-specific filters

The current filters are useful but fixed. The next sustainable step is not “add one more toggle”; it is to define a descriptor model for:
- id
- label
- kind
- grouping
- active-state serialization
- evaluation function / source
- optional project-defined metadata

Built-in filters remain product-owned, but the shape becomes open to future extension.

### Decision: Separate path search from full-text content search

The current Explorer search is effectively path/name matching over tracked and untracked files.

That is useful, but it is not the same capability as cross-file content search.

Explorer should eventually model search as two related but distinct capabilities:
- path/name search for fast tree reduction;
- content search for cross-file keyword/location discovery.

This matters because the UX, result model, performance constraints, and indexing strategy differ:
- path search should stay lightweight and instant enough to drive the tree directly;
- content search may need ripgrep-style execution, match counts, per-file line previews, and different result presentation;
- content replace needs a stricter safety model than content search because it mutates many targets at once.

The plan should therefore avoid hiding full-text search behind the existing filename filter box.

### Decision: Content search should lead naturally to reviewable replace workflows

For a serious editor, “search all files” without a strong “replace with review” model is incomplete.

Explorer-adjacent search should eventually support:
- content search results with file/snippet evidence;
- replace preview and target counts;
- scoped execution (`selection`, `folder`, `project`, future working set);
- deterministic confirmation semantics for multi-file mutation.

This should be modeled as a first-class capability in the plan, even if implementation lands in stages.

### Decision: Baseline file and folder operations must not regress during registry work

Explorer refactoring must not weaken baseline editor operations such as:
- file copy / cut / paste;
- folder copy / move;
- duplicate;
- rename;
- conflict-safe naming;
- drag/drop import and move behavior.

The registry work changes how actions are described, not whether those operations remain available.

### Decision: Add an Explorer command registry for action grammar

The current context menu and header actions are operationally fine but architecturally closed.

Explorer should move toward a registry with:
- command id
- label
- icon
- action group
- surface (`header`, `context_menu`, future `palette`, etc.)
- `when` predicate
- handler target

This does not need to become a full plugin API immediately. It only needs to stop being hard-coded JSX lists.

### Decision: Treat working-set views as a first-class Explorer capability family

`Changed Files` should be reinterpreted as the first member of a working-set family instead of a one-off panel.

The model should later support:
- changed files
- semantic files
- recent files
- session/agent-relevant files
- imported/research-derived files

This helps Explorer scale as a task-reduction surface, not only a path tree.

### Decision: The browser lane is a bounded research lane, not a browser product

Borrow from Obsidian Web Viewer and `cmux` the workflow principle:
- open a URL inline when it is part of current work;
- inspect or normalize the content;
- save/import/cite it into the repo or workflow artifacts;
- allow an explicit “open in system browser” escape hatch.

Do not borrow the product posture of becoming a general-purpose browser.

## Phase Plan

### Phase 1: Capability Architecture

Scope:
- filter descriptor model
- search capability split (`path search` vs `content search`) at the contract/design level
- content replace safety model at the contract/design level
- Explorer command registry
- serialization/state hooks for the new filter model
- migration of current header/context-menu actions into command definitions

Exit criteria:
- current built-in behavior preserved;
- the product distinguishes between tree reduction search and content search at the requirement level;
- the product defines how content replace will be scoped, previewed, and confirmed before implementation starts;
- no regressions in file mutation routing;
- Explorer actions can be described declaratively without changing execution code.

### Phase 2: Working-Set Views

Scope:
- formalize working-set model
- promote `Changed Files` into the first registered working-set view
- define state model for future working-set members
- align interaction grammar between tree and working-set views

Exit criteria:
- `Changed Files` no longer feels like an exception path;
- grouped/alternate views use the same action grammar as Explorer tree;
- future views can be added without inventing new panel architecture each time.

### Phase 3: Project Policy and Presets

Scope:
- project-level Explorer policy
- filter presets / default working sets
- optional action visibility policy and semantic bundles

Exit criteria:
- repo-specific Explorer behavior can be expressed without forking UI code;
- defaults are deterministic and discoverable.

### Phase 4: Bounded URL / Browser Research Lane

Scope:
- bounded URL browser/research surface
- URL -> reader/preview -> save/import/cite pipeline
- explicit capability boundary and system-browser escape hatch

Exit criteria:
- URL research accelerates file workflows directly;
- the lane remains clearly subordinate to the editing workspace rather than becoming a browser app.

## Risks / Trade-offs

- Registry work can become abstract for abstraction’s sake.
  - Mitigation: keep phase 1 tied to migrating real existing filters and actions.

- Working-set views can multiply and clutter Explorer.
  - Mitigation: define a small initial family and strict inclusion criteria.

- Browser/research lane can become scope creep.
  - Mitigation: require URL -> file/workflow handoff to justify the lane; do not build generic browsing features.

## Engineer Handoff

The next engineer should treat this as an architecture-first Explorer change, not as another round of local UI polish.

The implementation order matters:
1. move current built-ins into a filter descriptor model;
2. move current header/context-menu actions into a command registry;
3. define content-search requirements and result model before wiring any UI that pretends filename search already solves the same problem;
4. define content-replace safety and confirmation semantics before implementation starts;
5. only then promote `Changed Files` into the first real working-set view;
6. do not start browser-lane implementation until the earlier phases make Explorer structurally ready for it.

Two practical warnings:
- preserve the current file intent gateway and related mutation hooks unless a specific phase explicitly requires changing them;
- do not let the browser lane expand into “general web UI”; keep it tied to URL -> file/workflow handoff.

The expectation is not merely “make Explorer more powerful”.

The expectation is: make future Explorer growth cheaper, clearer, and harder to fragment.
