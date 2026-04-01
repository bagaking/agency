# Change: Replace Iframe View With A True Browser Surface

## Why
Agency's current bounded web research `View` still lives inside a renderer `iframe`. That creates two structural failures:
- sites that deny embedding via `X-Frame-Options` or `Content-Security-Policy frame-ancestors` cannot render even though users expect `View` to behave like a browser;
- hostile or unstable embedded pages can still stress the renderer lifecycle unless extra defensive code keeps being layered around the iframe host.

If `View` is meant to act like a browser surface, it should stop pretending to be a child frame and instead be hosted as a first-class Electron browser surface. `Reader`, `Save Markdown`, `Cite`, and `Open in Browser` remain bounded research affordances; only the `View` host changes.

## What Changes
- Replace the iframe-backed bounded web research `View` with a true Electron browser surface hosted outside renderer DOM.
- Keep `Reader` as the bounded extracted-content mode and preserve `Save Markdown`, `Cite`, and `Open in Browser` semantics.
- Define explicit browser-surface lifecycle ownership for create/show/hide/navigate/dispose so Workbench tabs stay coherent and recoverable.
- Keep browser-surface state bounded to the focused Workbench web research tab instead of creating a window-global browser product.
- Update specs, notes, README, reusable-items docs, and manual verification to describe `View` as a browser surface rather than an iframe attempt.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - `apps/editor/electron/main.ts`
  - new Electron browser-surface service / IPC seams
  - `apps/editor/renderer/src/components/workbench/*`
  - `apps/editor/renderer/src/hooks/useWorkbench.ts`
  - docs / tests / packaging verification
- Risks:
  - browser-surface ownership could leak across tabs or windows if lifecycle is not explicit;
  - a top-level browser surface could drift toward a general browser product if bounded limits are not preserved;
  - introducing main-process browser state could duplicate Workbench tab state unless one source of truth is enforced.
- Mitigation:
  - keep Workbench tab metadata as SSOT and treat browser surface as a host projection of the active bounded-research tab;
  - do not add browser-global tabs/history/downloads/cookies UI;
  - dispose hidden surfaces aggressively when tabs close or focus changes.
