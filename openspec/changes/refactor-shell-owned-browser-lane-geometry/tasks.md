## 1. Specification And Documentation
- [ ] 1.1 Update the `agency-editor` spec to require shell-owned browser-lane geometry and explicit occlusion behavior.
- [ ] 1.2 Update browser-surface notes and reusable-items docs to describe the shell-owned pane contract.
- [ ] 1.3 Update README/manual verification once the shell-owned model lands.

## 2. Shell Geometry Contract
- [ ] 2.1 Introduce a renderer-side shell/workbench browser-lane geometry model owned outside tab-local browser fragments.
- [ ] 2.2 Define browser-lane visibility/occlusion state for attention rail, HIL drawer, and modal/popover families.
- [ ] 2.3 Stop using nested tab-local DOM measurement as the authoritative native placement source.

## 3. Native Browser Host Integration
- [ ] 3.1 Make the Electron browser-surface service consume shell-owned browser-lane geometry.
- [ ] 3.2 Fail closed on invalid geometry or occluded states instead of preserving stale placement.
- [ ] 3.3 Keep navigation/history bounded while preserving Workbench tab metadata as SSOT for the research object.

## 4. Validation
- [ ] 4.1 Add unit coverage for shell geometry ownership and invalidation/hide behavior.
- [ ] 4.2 Add regression coverage for attention rail / HIL drawer / browser lane coexistence.
- [ ] 4.3 Run targeted tests and packaged verification with shell-geometry logging.
