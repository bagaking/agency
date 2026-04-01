## 1. Specification And Documentation
- [x] 1.1 Update the `agency-editor` spec from iframe-backed `View` wording to browser-surface host wording.
- [x] 1.2 Update Explorer/Workbench notes, README, and manual test docs to reflect the new host model and bounded limits.
- [x] 1.3 Update reusable-items docs for the new Electron browser-surface seam.

## 2. Native Browser Surface Host
- [x] 2.1 Add an Electron service that owns browser-surface lifecycle per window + bounded research tab.
- [x] 2.2 Add preload / IPC bridge methods for ensure/show/hide/navigate/dispose/query state.
- [x] 2.3 Block host drift into window-global browser behavior; keep lifecycle keyed to Workbench bounded research tabs.

## 3. Renderer Integration
- [x] 3.1 Replace iframe-backed `View` with a browser-host shell in Workbench bounded web research.
- [x] 3.2 Keep `Reader`, `Save Markdown`, `Cite`, linked Markdown preview, and `Open in Browser` coherent with the new host.
- [x] 3.3 Support editable URL navigation inside the bounded host without duplicating Workbench tab SSOT.

## 4. Validation
- [x] 4.1 Add unit coverage for browser-host lifecycle state and bounded research tab state transitions.
- [x] 4.2 Add E2E coverage for browser-surface navigation and blocked-site behavior.
- [x] 4.3 Run typecheck, targeted tests, and packaged build verification.
