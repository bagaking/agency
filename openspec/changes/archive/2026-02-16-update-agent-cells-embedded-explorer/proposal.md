# Change: Update Agent Cells embedded Explorer panel

## Why
Agent Cells currently has an Explorer-related file dashboard, but the interaction and placement still feel disconnected from the main Explorer mental model.

There are three gaps:
- Visual hierarchy mismatch: the panel sits near the top controls instead of matching the "Agent-in-bottom" style and context flow users expect.
- Data semantics mismatch: users expect "modified files" for the selected Cell/worktree, but current entries are primarily extracted from session preview references.
- Interaction gap: panel rows support drag start, but there is no complete drag/drop workflow for importing files into the selected Cell worktree from that panel region.

## What Changes
- Reposition Agent Cells Explorer panel to a bottom-anchored section in the Agent Cells sidebar, aligned with the currently selected Cell context (collapsed bottom bar + resizable half-height expansion).
- Define Cell-scoped data semantics (worktree-based):
  - provide `Changes` (git-modified via canonical Explorer status, excluding ignored) and `All` (tracked+untracked file list, with truncation hint) views for the selected Cell/worktree.
- Avoid session-granularity file attribution in the embedded Explorer panel to prevent ambiguous "which session changed this file" semantics.
- Keep Flat/Tree presentation modes, with deterministic sorting and stable empty states for each view.
- Add an Explorer sidebar companion changed-files panel above the Agent footer/session card, using the same visual language as Agent Cells embedded Explorer for cross-view continuity.
- Keep row-level `open`/`reveal` actions routed through unified file intents, and add in-place preview (without forcing view switch) for rapid inspection.
- Extend panel interactions with drag/drop workflow:
  - drag-out remains `text/plain` absolute-path payload.
  - drop-in (external files / file URIs) imports into selected Cell worktree via unified `import_copy` semantics.
- Extract reusable file-dashboard list rendering so Agent Cells and Explorer companion panel share row/tree/preview behaviors.
- Update docs to reflect the refined Agent Cells + Explorer continuity behavior.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/AgentCellsSidebar.tsx`
  - `apps/editor/renderer/src/utils/agentCellFileChanges.ts`
  - `apps/editor/renderer/src/hooks/useProjectExplorer.ts` (shared helpers if extracted)
  - `apps/editor/renderer/src/services/fileInteraction.ts`
  - `apps/editor/electron/services/explorer.ts` / IPC access path for status source
  - docs (`docs/notes-file-interaction-system.md`, `apps/editor/README.md`)
- Risk:
  - Larger panel refresh loops can regress sidebar responsiveness.
  - Filter semantics can confuse users if labels are not explicit (`Changes` vs `All`).
  - New drop-in path can introduce duplicate import edge cases.
- Mitigation:
  - Reuse existing status cache and bounded refresh cadence.
  - Explicit filter labels and empty-state copy.
  - Reuse unified `import_copy` conflict/path-safety behavior and existing tests.
