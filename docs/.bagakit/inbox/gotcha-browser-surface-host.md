---
title: Browser surface should stay browser-first and avoid faux reloads
kind: gotcha
status: inbox
tags:
  - gotcha
sources:
  - apps/editor/electron/services/workbenchBrowserSurface.ts
  - apps/editor/renderer/src/components/workbench/useWorkbenchBrowserSurface.ts
  - apps/editor/renderer/src/components/workbench/WorkbenchBoundedWebResearchView.tsx
created: 2026-04-02
---

## Candidate
- A native `WebContentsView` solves iframe/CSP failures, but it behaves like a top-level window child, not a clipped DOM node. If the product still treats it like “content inside a card,” the host will feel offset or cover neighboring UI.
- The browser surface should be a browser-first panel: compact toolbar chrome, dominant page area, and a stable rectangular host slot. Avoid explanatory text blocks above the page once the object is already in Workbench.
- Do not reset renderer state to `loading` every time `View` becomes visible. That creates a faux reload even when the native surface preserved page state correctly.
- Re-showing a native browser surface may require explicitly re-adding it to the parent view so it stays topmost among sibling child views.

## Promote To
- `docs/.bagakit/memory/gotcha-browser-surface-host.md` (curated), or
- `docs/<type>-<topic>.md` (normative/deep guide)
