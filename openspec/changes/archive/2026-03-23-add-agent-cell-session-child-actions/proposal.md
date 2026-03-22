# Change: Add Agent Cell child session actions

## Why
The session topology tree is now in place, but users still cannot intentionally create typed child nodes from an existing session. To make the tree useful for upcoming execution patterns, Agent Cells needs direct creation flows for `sub terminal` and `fork` child sessions.

## What Changes
- Add session-level creation actions for `Sub Terminal` and `Fork` in Agent Cells.
- Create these child sessions under the selected parent session using the existing session topology registry.
- Preserve current session lifecycle behavior and active-session selection semantics.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/SessionMenus.tsx`
  - `apps/editor/renderer/src/components/agentCells/AgentCellsSessionsPanel.tsx`
  - `apps/editor/README.md`
  - `apps/editor/docs/manual-test.md`
