## 1. Specification And Documentation
- [ ] 1.1 Update the `agency-editor` spec so Explorer owns URL intake and Workbench owns the bounded web research host tab.
- [ ] 1.2 Update Explorer/file-interaction notes and README/manual verification to reflect the new host model and bounded-browser limits.
- [ ] 1.3 Update reusable-items documentation if new shared Workbench/explorer research seams become canonical.

## 2. Workbench Host Model
- [ ] 2.1 Add an explicit bounded web research tab kind to the Workbench tab model and loaders.
- [ ] 2.2 Refactor the existing bounded research controller/state so it can be hosted by Workbench without duplicating URL state.
- [ ] 2.3 Render the bounded web research tab in Workbench with page-level actions (`Reload`, `Open in Browser`, `Save Markdown`, `Cite`) and bounded status/error states.

## 3. Explorer Intake And Shortest Path
- [ ] 3.1 Replace Explorer's current URL host panel flow with a launch/focus path into the Workbench bounded web tab.
- [ ] 3.2 Add a URL-aware affordance in the shared Explorer search row when the typed input resembles a supported public URL and the current surface allows URL research.
- [ ] 3.3 Keep `Paths / Content / URL` mode semantics and persistence coherent without duplicating tab or URL state across Explorer and Workbench.

## 4. Validation
- [ ] 4.1 Add unit coverage for new Workbench tab contracts and URL-aware affordance behavior.
- [ ] 4.2 Add Playwright coverage for Explorer intake -> Workbench bounded web tab transition and action availability.
- [ ] 4.3 Run targeted tests/typechecks and record validation evidence.
