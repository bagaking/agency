# Change: Refine attention surface hierarchy

## Why
Attention is a shared state layer, but the current interaction rules do not clearly assign which surfaces own queue triage versus inline or shell-level summaries.
That ambiguity made it easy for Agent Cells to grow a queue card above the primary Cell/Session management list, which weakens hierarchy and steals space from the surface's main job.

## What Changes
- Define bounded attention roles by surface:
  - Session Map `Ops` owns queue-style triage for current-window attention.
  - shell chrome owns compact summaries such as Status Bar `Next` and the window switcher summary.
  - Agent Cells keeps attention inline on owning Cell / Session affordances and does not prepend a queue card ahead of the management list.
- Update canonical docs and reusable-item catalogs so the hierarchy survives future refactors.
- Remove the queue-style attention card from Agent Cells while preserving clickable inline attention pills on Cells and Sessions.

## Impact
- Affected specs: `agency-editor`
- Affected code: `apps/editor/renderer/src/components/agentCells/AgentCellsSessionsPanel.tsx`
- Affected docs: `docs/notes-session-management.md`, `apps/editor/README.md`, `apps/editor/docs/manual-test.md`, reusable-item catalogs
