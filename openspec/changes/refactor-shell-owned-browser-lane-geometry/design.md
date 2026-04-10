## Context
The current bounded browser lane already established the right product noun:
- Explorer owns intake;
- Workbench owns the research object;
- `View` is native;
- `Reader` and research actions remain bounded.

What is still wrong is the ownership model for placement. A tab-local renderer fragment still measures the browser host and projects that measurement into the main process. That means shell siblings affect the browser lane indirectly and reactively instead of through one authoritative pane contract.

## Goals / Non-Goals
- Goals:
  - make browser-lane geometry a shell/workbench concern instead of a tab-local DOM concern;
  - make native browser occlusion behavior explicit for shell siblings and overlays;
  - preserve bounded web research semantics while removing projected-host fragility.
- Non-Goals:
  - no general browser product;
  - no browser-global tabs/history/downloads/cookies UI;
  - no rewrite of Reader/save/cite object semantics;
  - no dependence on hidden Electron implementation details as the long-term SSOT.

## Decisions
- Decision: introduce one shell-owned browser lane rect contract.
  - Why: the shell already owns sidebar width, attention rail, HIL drawer, title bar, and main panel massing. Browser lane geometry must be derived at the same layer.
- Decision: in Agency's hybrid renderer/native shell, shell-owned geometry means one Workbench-owned viewport host plus one explicit renderer-view seam, not “measure a different DOM node.”
  - Why: Agency is not a full-native pane tree like cmux. One renderer viewport host is unavoidable today, but projected relays through nested browser fragments or shell proxy hosts still preserve the same fragility under a new name.
- Decision: tab-local browser hosts may remain as fallback anchors or debug affordances, but they are not the authoritative native placement owner.
  - Why: a nested host is useful for renderer-local state and testing, but it is not the correct owner for a native pane.
- Decision: main-side geometry must fail closed when renderer-view bounds cannot be resolved.
  - Why: trusting raw renderer coordinates recreates the same coordinate-space drift under a stricter name.
- Decision: third-party websites are not authoritative geometry fixtures.
  - Why: sites such as GitHub legitimately use centered columns, gutters, and load-phase layout transitions that can look like host offset even when the native surface is aligned.
- Decision: host geometry verification needs a controlled probe page in addition to real-site manual checks.
  - Why: without a deterministic probe, the team cannot reliably separate host-placement bugs from page-layout choices.
- Decision: native browser visibility must include an explicit occlusion state.
  - Why: shell overlays do not naturally compose with `WebContentsView`; "still visible but visually wrong" is worse than bounded hide/suspend behavior.
  - Participating shell surfaces:
    - attention rail;
    - HIL drawer;
    - modal/popover families that visually cover the lane;
    - future shell-owned side stations or split siblings.
- Decision: each participating shell surface must declare whether it resizes the lane, suspends it, or hides it.
  - Why: “something changed in layout” is too vague; the browser host needs deterministic priority rules instead of best-effort observers.
- Decision: shell geometry and tab metadata stay separate.
  - Why: Workbench tab metadata remains SSOT for the research object (`url`, title, permissions, linked markdown state). Shell geometry is SSOT for placement and occlusion only.
- Decision: geometry fallback should fail closed.
  - Why: if shell geometry is unavailable, the browser lane should hide or suspend instead of preserving stale native bounds.

## Architecture
```mermaid
flowchart TD
  A[App Shell / Workbench Layout] --> B[Browser Lane Geometry Model]
  B --> C[Occlusion Model]
  B --> D[Renderer Bridge Payload]
  D --> E[Main Browser Surface Service]
  E --> F[WebContentsView Bounds]
  G[Workbench Research Tab Metadata] --> H[Browser Lane Intent]
  H --> D
```

### Shell geometry model
- Produced by the shell/workbench layout owner.
- Defines:
  - one authoritative browser viewport host;
  - active owner tab id;
  - visibility / suspended / occluded state;
  - sibling shell context relevant to the lane.

### Browser surface service
- Consumes shell geometry model.
- Owns:
  - create/show/hide/dispose;
  - navigate / history;
  - failure reporting;
  - strict hide when geometry or occlusion invalidates the lane.

### Renderer workbench
- Continues to own browser chrome, Reader, save/cite, and research object state.
- Owns one authoritative browser viewport host and stops relaying geometry through nested browser fragments or shell proxy hosts.

## Risks / Trade-offs
- Shell-owned geometry increases coupling between layout and browser host.
  - Mitigation: keep the contract narrow and typed; geometry only, not research metadata.
- Occlusion rules can become over-eager and flicker if transition states are noisy.
  - Mitigation: define a small state machine (`visible | suspended | hidden`) and test transition edges.
- Incremental rollout may temporarily mix old and new geometry paths.
  - Mitigation: keep one adapter boundary and delete projected-host ownership once shell path is validated.
- BrowserWindow content-area fallback may still be an approximation of the renderer/native seam.
  - Mitigation: keep the fallback explicit, log it, and validate host alignment against a controlled probe page before treating real-site screenshots as evidence of host failure.

## Migration Plan
1. Add spec/docs for shell-owned browser lane geometry and occlusion.
2. Introduce a shell geometry model that can be observed and logged without changing native placement yet.
3. Switch native browser placement to consume shell geometry.
4. Remove tab-local authoritative placement assumptions and delete the projected-host fallback path.
5. Add a deterministic probe page and regression coverage so host alignment can be verified independently of third-party site layout.
6. Add regression coverage for rail/drawer/modal layout changes and packaged behavior.
