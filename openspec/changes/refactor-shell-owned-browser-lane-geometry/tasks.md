## 1. Specification And Documentation
- [x] 1.1 Update the `agency-editor` spec to require a Workbench-owned browser viewport host, an explicit renderer-view seam, and fail-closed native placement.
- [x] 1.2 Update browser-surface notes, AGENTS, and reusable-items docs to describe the authoritative viewport-host contract.
- [x] 1.3 Update README/manual verification once the new viewport-host model lands.

## 2. Shell Geometry Contract
- [x] 2.1 Introduce a Workbench-owned browser viewport host owned outside tab-local browser fragments and shell relay hosts.
- [x] 2.2 Define explicit lane visibility behavior: browser-owned blocking flows suspend the lane, shell siblings resize the authoritative viewport host, and invalid native mapping hides the lane.
- [x] 2.3 Stop using nested tab-local DOM relay measurement as the authoritative native placement source.
- [x] 2.4 Delete or fully demote the projected-host fallback path once the viewport-host model is live.

## 3. Native Browser Host Integration
- [x] 3.1 Make the Electron browser-surface service consume the authoritative Workbench viewport host geometry.
- [x] 3.2 Fail closed on invalid geometry or missing renderer-view seam instead of preserving stale placement.
- [x] 3.3 Keep navigation/history bounded while preserving Workbench tab metadata as SSOT for the research object.
- [x] 3.4 Verify whether the BrowserWindow content-area seam is sufficient in production, or replace it with a stronger explicit owner seam if runtime evidence still shows clipping/drift.

## 4. Validation
- [x] 4.1 Add unit coverage for viewport-host ownership and invalidation/hide behavior.
- [x] 4.2 Add regression coverage for removal of the shell relay path and fail-closed native geometry mapping.
- [x] 4.3 Run targeted tests and attempt packaged verification; document environment blockers when packaging preflight cannot complete.
- [x] 4.4 Add a deterministic browser probe page / fixture so host alignment can be verified independently of third-party website layout.
- [x] 4.5 Re-run packaged validation and compare probe-page bounds against runtime logs after the remaining seam/layout work lands.

## Verification Notes
- Packaged dir probe: launched `apps/editor/dist/release/mac-arm64/Agency.app/Contents/MacOS/Agency` with `AGENCY_TEST_MODE=1`, synced `https://agency-browser-probe.test/surface-probe`, observed `phase: ready`, `title: Agency Browser Surface Probe`, native `bounds: { x: 120, y: 140, width: 520, height: 320 }` within `contentBounds: { width: 1280, height: 820 }`, and runtime log `browser surface resolved bounds` with `mappedBounds` matching the probe bounds and `explicitRendererViewBounds: true`.
