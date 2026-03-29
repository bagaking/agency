# Change: Defer heavyweight renderer surfaces and runtimes

## Why
Agency currently pays startup and steady-state cost for several heavyweight renderer surfaces before the user asks for them. The current shell eagerly loads or mounts heavy paths such as Session Map overlay plumbing, Monaco-backed editors, and animation runtimes even when those surfaces are hidden.

That cost shows up as:
- slower cold launch and first interaction;
- higher renderer helper memory;
- higher GPU/compositor pressure from surfaces that are not currently in use;
- more ad hoc one-off lazy/loading decisions that can become fragile if every feature reinvents its own gating.

## What Changes
- Add a shared renderer mechanism for deferring heavyweight surface mount lifecycle (`DeferredMount`) instead of scattering conditional JSX and local “has mounted” flags.
- Add a shared lazy Monaco wrapper (`LazyMonacoEditor`) with explicit preload affordance so Monaco usage converges on one runtime-loading contract.
- Update the shell to avoid mounting the Session Map overlay while it is closed.
- Defer first mount of the Explorer workbench pane until the user actually activates Explorer, while preserving existing behavior after first access.
- Route Monaco-backed surfaces through the shared lazy wrapper instead of direct static `@monaco-editor/react` imports.
- Convert the Rive animation component into a deferred runtime wrapper so the animation runtime is not parsed until a Rive surface is actually rendered.
- Update project charter/norms/reusable-items docs so future heavy renderer surfaces follow the same performance contract by default.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/app/AppShellChrome.tsx`
  - `apps/editor/renderer/src/components/layout/AppMainPanels.tsx`
  - `apps/editor/renderer/src/components/workbench/CodeWorkbenchView.tsx`
  - `apps/editor/renderer/src/components/sessionReply/SessionReplyComposer.tsx`
  - `apps/editor/renderer/src/components/RiveAnimation.tsx`
  - new shared deferred/lazy renderer helpers
  - `docs/norms-dev.md`
  - `docs/notes-reusable-items-coding.md`
  - `openspec/project.md`
- Risk:
  - introducing deferred loading can create first-open latency or state loss if the lifecycle boundary is chosen poorly;
  - Monaco and Session Map integration can regress if wrappers leak too much implicit behavior.
- Mitigation:
  - keep the deferred behavior behind shared mechanisms with explicit mount strategies;
  - preserve state outside deferred boundaries;
  - validate with typecheck/build after integrating the wrappers.
