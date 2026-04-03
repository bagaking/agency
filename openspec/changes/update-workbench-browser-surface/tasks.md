## 1. Specification And Documentation
- [x] 1.1 Update the `agency-editor` spec from iframe-backed `View` wording to browser-surface host wording.
- [ ] 1.2 Update the spec/design/docs contract from tab-local host projection to a Workbench-owned browser-lane split primitive.
- [ ] 1.3 Update Explorer/Workbench notes, README, and manual test docs to reflect the browser-lane owner model and bounded limits.
- [ ] 1.4 Update reusable-items docs for the Workbench browser-lane controller and native host seam.

## 2. Native Browser Surface Host
- [x] 2.1 Add an Electron service that owns browser-surface lifecycle per window + bounded research tab.
- [x] 2.2 Add preload / IPC bridge methods for ensure/show/hide/navigate/dispose/query state.
- [x] 2.3 Block host drift into window-global browser behavior; keep lifecycle keyed to Workbench bounded research tabs.
- [ ] 2.4 Keep the host service lifecycle-only; move geometry ownership out of tab-local renderer leaves.

## 3. Renderer Integration
- [x] 3.1 Replace iframe-backed `View` with a browser-host shell in Workbench bounded web research.
- [ ] 3.2 Introduce a Workbench-owned browser-lane/split primitive that owns native-browser geometry.
- [ ] 3.3 Move browser lifecycle orchestration out of `WorkbenchBoundedWebResearchView` and into the Workbench-owned lane/controller.
- [ ] 3.4 Keep `Reader`, `Save Markdown`, `Cite`, linked Markdown preview, and `Open in Browser` coherent with the new browser-lane owner.
- [ ] 3.5 Support editable URL navigation inside the bounded host without duplicating Workbench tab SSOT.

## 4. Validation
- [x] 4.1 Add unit coverage for browser-host lifecycle state and bounded research tab state transitions.
- [ ] 4.2 Add regression coverage for browser-lane geometry ownership and HIL/sidebar coexistence.
- [ ] 4.3 Add E2E coverage for browser-surface navigation and blocked-site behavior.
- [ ] 4.4 Run typecheck, targeted tests, and packaged build verification.
