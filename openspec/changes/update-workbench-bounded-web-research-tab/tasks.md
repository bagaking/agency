## 1. Specification And Documentation
- [x] 1.1 Update the `agency-editor` spec so Explorer owns URL intake and Workbench owns the bounded web research host tab.
- [x] 1.2 Update Explorer/file-interaction notes and README/manual verification to reflect the new host model and bounded-browser limits.
- [x] 1.3 Update reusable-items documentation if new shared Workbench/explorer research seams become canonical.

## 2. Workbench Host Model
- [x] 2.1 Add an explicit bounded web research tab kind to the Workbench tab model and loaders.
- [x] 2.2 Refactor the existing bounded research controller/state so it can be hosted by Workbench without duplicating URL state.
- [x] 2.3 Render the bounded web research tab in Workbench with page-level actions (`Reload`, `Open in Browser`, `Save Markdown`, `Cite`) and bounded status/error states.
- [x] 2.4 Save Markdown with fixed source frontmatter and reopen it as a linked markdown + preview workbench mode.

## 3. Explorer Intake And Shortest Path
- [x] 3.1 Replace Explorer's current URL host panel flow with a launch/focus path into the Workbench bounded web tab.
- [x] 3.2 Add a URL-aware affordance in the shared Explorer search row when the typed input resembles a supported public URL and the current surface allows URL research.
- [x] 3.3 Keep `Paths / Content / URL` mode semantics and persistence coherent without duplicating tab or URL state across Explorer and Workbench.

## 4. Validation
- [x] 4.1 Add unit coverage for new Workbench tab contracts, frontmatter handling, and URL-aware affordance behavior.
- [x] 4.2 Add Playwright coverage for Explorer intake -> Workbench bounded web tab transition and action availability.
- [x] 4.3 Run targeted tests/typechecks and record validation evidence.
