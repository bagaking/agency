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
  - keep Workbench tab state as SSOT while the browser surface is a host projection.
- Non-Goals:
  - no browser-global multi-tab product;
  - no cookie manager, download manager, auth/session UI, or history chrome;
  - no migration of Reader into the browser host.

## Decisions
- Decision: `View` becomes an Electron-owned browser surface, not a renderer iframe.
  - Why: sites that block framing should still render in a browser-like host.
- Decision: browser-surface ownership belongs to the active Workbench bounded web research tab.
  - Why: Workbench tabs are already the canonical object layer; the host must project that object rather than invent a second tab root.
- Decision: the renderer requests host lifecycle changes through explicit IPC commands (`ensure`, `show`, `hide`, `navigate`, `dispose`, `snapshot status`).
  - Why: single-responsibility and recoverability; renderer should not carry native host logic.
- Decision: the browser surface is bounded to one focused research tab per window.
  - Why: avoids turning Agency into a general browser while still making `View` real.
- Decision: if `Reader` is selected, the browser host is hidden rather than destroyed when possible; if the tab or window closes, it is disposed.
  - Why: preserve responsiveness without leaking orphan native views.

## Architecture
- Workbench tab metadata remains the source of truth: `url`, `title`, `rootPath`, linked markdown state, save/cite permissions.
- A new Electron browser-surface service owns native browser view instances keyed by `windowId + tabId`.
- Renderer Workbench requests browser-surface state transitions through the preload bridge.
- `View` mode in renderer becomes a browser-host status shell, not an iframe.
- `Reader` mode remains renderer-owned extracted content.

## Risks / Trade-offs
- Native view layering and resize synchronization can become fragile.
  - Mitigation: centralize bounds computation and tie it to Workbench layout lifecycle in one place.
- Hiding rather than disposing may retain site state longer than desired.
  - Mitigation: limit to focused tab per window and dispose on tab close / url change / window close.
- Browser host crashes could leave blank regions.
  - Mitigation: emit host status back to renderer and fail closed to Reader/Open in Browser rather than infinite retries.

## Migration Plan
1. Add spec/docs for browser-surface host.
2. Add native browser-surface service and IPC bridge with no renderer adoption yet.
3. Swap renderer `View` from iframe to browser-host shell.
4. Add tests for lifecycle, navigation, and failure fallback.
5. Remove iframe-specific fallback logic that is no longer relevant.
