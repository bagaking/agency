# Change: Add Agent Session Map overlay

## Why
Agency needs a cross-screen, always-available map view so users can understand and navigate all Cells/Sessions in a single mental model, similar to an SLG/RTS overview.

## What Changes
- Add a global map overlay anchored to the status bar (center) that is visible across all screens.
- Represent **Cells** as factional "city/cluster" nodes and **Sessions** as "role" tokens inside each Cell cluster.
- Include Archived/Closed/Stale sessions as "offline" state, visually distinct from active ones.
- Provide click-to-jump navigation to a selected session (no drag/zoom/fog in v1), and a hover terminal preview that can be clicked to jump.
- Default-open the map on first entry; subsequent opens are user-toggled.
- Default faction colors derive from Cell type + creation order, with configurable overrides.
- Show compact statistics (total cells/sessions/online/offline) to handle large counts.
- Use a fixed, reasonable layout with internal scrolling when needed (no manual layout editing in v1).

## Impact
- Affected specs: openspec/specs/agency-editor/spec.md
- Affected UI: status bar overlay + cross-screen map layer
- Affected code: renderer App layout, map components, session/cell data aggregation
