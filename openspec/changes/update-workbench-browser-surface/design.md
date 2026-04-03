## Context
The current bounded web research model already made the correct product split:
- Explorer owns URL intake;
- Workbench owns the research object;
- Reader/Save/Cite stay bounded;
- full browser escape still uses the system browser.

The remaining broken layer is only the `View` host. It is still a renderer iframe, so browser-denied sites fail for reasons unrelated to Agency's product intent.

## Goals / Non-Goals
- Goals:
  - make `View` behave like a real browser surface for the focused bounded web research tab;
  - preserve bounded research actions and linked Markdown semantics;
  - keep Workbench tab state as SSOT while the browser surface is a host projection of a Workbench-owned browser lane.
- Non-Goals:
  - no browser-global multi-tab product;
  - no cookie manager, download manager, auth/session UI, or history chrome;
  - no migration of Reader into the browser host.

## Decisions
- Decision: `View` becomes an Electron-owned browser surface, not a renderer iframe.
  - Why: sites that block framing should still render in a browser-like host.
- Decision: browser-surface ownership belongs to the active Workbench bounded web research tab.
  - Why: Workbench tabs are already the canonical object layer; the host must project that object rather than invent a second tab root.
- Decision: browser geometry ownership belongs to a Workbench split primitive, not to a tab-local DOM subtree.
  - Why: shell/layout chrome (`SidebarDock`, Attention rail, HIL drawer, Workbench splits) is the durable geometry owner. A nested tab component can describe browser intent, but it should not be the authority for native host placement.
- Decision: the renderer requests host lifecycle changes through explicit IPC commands (`ensure`, `show`, `hide`, `navigate`, `dispose`, `snapshot status`).
  - Why: single-responsibility and recoverability; renderer should not carry native host logic.
- Decision: the browser surface is bounded to one focused research tab per window.
  - Why: avoids turning Agency into a general browser while still making `View` real.
- Decision: if `Reader` is selected, the browser host is hidden rather than destroyed when possible; if the tab or window closes, it is disposed.
  - Why: preserve responsiveness without leaking orphan native views.

## Architecture
- Workbench tab metadata remains the source of truth for the bounded research object: `url`, `title`, `rootPath`, linked markdown state, save/cite permissions.
- A Workbench-owned browser-lane primitive owns:
  - whether a browser lane exists for the active tab;
  - the lane geometry relative to shell chrome and sibling panes;
  - the single active native browser slot per window.
- The Electron browser-surface service owns native browser view instances keyed by `windowId + tabId`.
- Renderer Workbench requests browser-surface state transitions through the preload bridge, but it does so from the browser-lane owner instead of from a tab-local content fragment.
- `View` mode becomes a bounded browser lane with native content dominance; `Reader` remains renderer-owned extracted content.

## Risks / Trade-offs
- Native view layering and resize synchronization can become fragile.
  - Mitigation: centralize bounds computation and tie it to one Workbench browser-lane owner rather than scattered host refs.
- Hiding rather than disposing may retain site state longer than desired.
  - Mitigation: limit to focused tab per window and dispose on tab close / url change / window close.
- Browser host crashes could leave blank regions.
  - Mitigation: emit host status back to renderer and fail closed to Reader/Open in Browser rather than infinite retries.
- Browser lane could drift into a general shell pane instead of a bounded research affordance.
  - Mitigation: keep tab metadata as SSOT, keep only one active browser lane per window, and preserve explicit system-browser escape instead of adding general browser chrome.

## Migration Plan
1. Add spec/docs for browser-surface host.
2. Add native browser-surface service and IPC bridge with no renderer adoption yet.
3. Introduce a Workbench-owned browser-lane primitive and move geometry ownership into that owner.
4. Swap renderer `View` from iframe/tab-local host to browser-lane shell.
5. Add tests for lifecycle, navigation, split geometry, and failure fallback.
6. Remove iframe-specific and leaf-owned host logic that is no longer relevant.
