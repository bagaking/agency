# Change: Add Agent Cell session topology tree

## Why
Agent Cells currently model sessions as a flat list under each Cell. That is enough for simple multi-session use, but it does not express execution relationships inside a Cell and it leaves no durable structure for upcoming `fork` and `sub terminal` flows.

We need the Agent Cells sidebar to represent session topology, not only session membership, while keeping the existing `Cell = worktree + branch` boundary intact.

## What Changes
- Replace the flat per-Cell session list in Agent Cells with a session topology tree.
- Add in-sidebar topology editing:
  - reorder among siblings
  - move a session under another session as a child
  - move a child session back out to a higher level
- Persist session hierarchy metadata in the per-worktree session registry with backward-compatible migration from existing flat registries.
- Introduce typed session node metadata (`root`, `sub_terminal`, `fork`) as the foundation for future fork/sub-terminal UX.
- Keep current session behaviors intact:
  - active-session selection
  - rename/avatar flows
  - detached/closed overflow handling
  - tmux/session lifecycle semantics

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/agentCells/AgentCellsSessionsPanel.tsx`
  - `apps/editor/renderer/src/components/AgentCellsSidebar.tsx`
  - `apps/editor/renderer/src/hooks/useSessions.ts`
  - `apps/editor/renderer/src/services/agencyBridge.ts`
  - `apps/editor/electron/ipc/handlers/sessions.ts`
  - `apps/editor/electron/services/sessions.ts`
  - `apps/editor/electron/services/sessionRegistry.ts`
  - `apps/editor/README.md`
- Risks:
  - session topology may be confused with Cell/worktree topology
  - drag-and-drop intent may be ambiguous without clear drop previews
  - registry migration and invalid-tree healing must not strand sessions
