# Change: Tighten Explorer And Workbench Affordance Completeness

## Why
Explorer and Workbench already expose many high-value capabilities, but a few visible affordances still overpromise relative to shipped behavior. The biggest issues are:
- top-level controls that appear first-class before the underlying capability exists;
- path-opening/search flows that are useful but too thin for the prominence they have in the UI;
- interaction contracts that are implemented in code but not yet reflected clearly in spec and README.

This reduces trust. Agency should not show a polished button for a capability that is not actually there.

## What Changes
- Tighten Workbench affordance honesty by removing or deferring unimplemented top-level controls.
- Upgrade Workbench quick-open from a thin path list into a clearer, richer file-launch surface.
- Continue hardening Explorer search/research/workflow surfaces so visible controls match real capability depth.
- Update the agency-editor spec and README so shipped capability boundaries are explicit and recoverable.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/workbench/*`
  - `apps/editor/renderer/src/components/explorer/*`
  - related renderer hooks/tests
  - README and OpenSpec truth
