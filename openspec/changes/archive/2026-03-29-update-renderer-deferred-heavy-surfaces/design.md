## Context
Agency is a desktop-shell editor with multi-window renderer processes, Monaco-backed editing, xterm-backed terminals, and Session Map visualization. Recent memory investigation showed that the biggest steady-state pressure is not one single helper, but the combination of GPU surfaces plus heavyweight renderer runtimes that are available too early.

The goal is not “add more lazy-loading everywhere”. The goal is to establish one project-level contract for heavyweight renderer surfaces:
- hidden heavy UI should not mount until needed;
- heavyweight third-party runtimes should load through shared wrappers;
- deferred behavior must be encapsulated, not reimplemented ad hoc in each feature.

## Goals / Non-Goals
- Goals:
  - reduce startup and steady-state renderer cost without removing product capabilities;
  - make hidden overlays and heavyweight editors opt-in by user interaction;
  - add reusable primitives so future work does not reintroduce eager mounting.
- Non-Goals:
  - redesign Session Map behavior or reduce feature scope;
  - replace Monaco, Rive, or xterm with different libraries;
  - add speculative complexity like a generic runtime orchestration framework for every dependency.

## Decisions
- Decision: introduce a shared `DeferredMount` component for renderer lifecycle gating.
  - Why: we need one explicit contract for “unmount while inactive” vs “retain after first activation”.
  - Alternatives considered:
    - inline `active && <Component />` everywhere: too ad hoc and easy to drift.
    - custom hook per feature: duplicates behavior and increases maintenance.

- Decision: introduce a shared `LazyMonacoEditor` wrapper with `preloadLazyMonacoEditor()`.
  - Why: Monaco is one of the heaviest renderer runtimes, and direct imports make it too easy to bypass the performance contract.
  - Alternatives considered:
    - keep static imports and only defer parent panels: reduces mount work but not bundle/runtime load.
    - convert each Monaco surface independently: brittle and duplicative.

- Decision: defer Session Map overlay with `DeferredMount` using unmount-on-close semantics.
  - Why: closed global overlays should not keep event/state/render trees alive.
  - Trade-off: overlay-local ephemeral UI state resets on close, which already matches current close semantics.

- Decision: defer Explorer workbench first mount with `DeferredMount` retain semantics.
  - Why: Explorer is not always the first active screen, but once visited it benefits from preserving local state.

- Decision: keep the Rive API stable while moving the runtime import behind a wrapper boundary.
  - Why: this preserves caller simplicity while shrinking eager startup cost.

## Risks / Trade-offs
- First-open latency for deferred surfaces may become more visible.
  - Mitigation: keep wrappers lightweight and expose preload hooks where interaction intent is known.

- Shared wrappers can become leaky abstractions if they try to cover too many cases.
  - Mitigation: keep the APIs narrow:
    - `DeferredMount`: only mount strategy + active flag.
    - `LazyMonacoEditor`: only editor loading + preload hook.

- Hidden state assumptions may break when a surface is unmounted.
  - Mitigation: only use unmount strategy where local UI state is already disposable on close.

## Migration Plan
1. Add `DeferredMount`.
2. Add `LazyMonacoEditor`.
3. Convert Session Map overlay and Explorer workbench to shared deferred mount rules.
4. Convert Monaco call sites.
5. Convert Rive runtime wrapper.
6. Update charter/norms/catalog docs.

## Open Questions
- Should we later add a shared “preload on hover/focus” wrapper for other large runtimes beyond Monaco?
- After this change lands, do we want a dedicated in-app memory diagnostics panel tied to renderer/window ids?
