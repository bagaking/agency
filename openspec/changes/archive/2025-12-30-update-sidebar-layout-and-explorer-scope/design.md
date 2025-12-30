## Context
Explorer, Agent Cells, and Hierarchy live in separate sidebars today, and the main pane still renders terminal content even when the Explorer view is active. The Activity Bar includes a Terminal entry that duplicates the terminal already embedded in the Agent Cells view.

## Goals / Non-Goals
- Goals:
  - Provide a unified, docked sidebar container with resize/collapse and persistent state.
  - Scope Explorer to the active Agent Cell worktree while keeping file previews in the main pane.
  - Keep the layout logic isolated from the Explorer/Agent Cells/Hierarchy modules.
- Non-Goals:
  - Replace or redesign the embedded terminal.
  - Implement a full code editor in the preview pane (read-only preview only).

## Decisions
- Decision: Remove the Terminal entry from the Activity Bar and keep terminal access inside Agent Cells.
  - Rationale: reduces navigation confusion and keeps terminal context tied to Cells.
- Decision: Introduce a shared SidebarDock component for resize/collapse and layout persistence.
  - Rationale: consistent behavior across views and easier future changes.
- Decision: Explorer uses the active Agent Cell worktree as its root and provides a simple file preview pane.
  - Rationale: keeps file operations isolated per Cell while still supporting IDE-style navigation.

## Risks / Trade-offs
- Larger UI refactor: sidebar layout changes touch multiple views.
  - Mitigation: isolate layout logic in a dedicated component and keep view components unchanged where possible.
- Preview limitations: read-only pane is not a full editor.
  - Mitigation: provide clear affordances to open files externally later if needed.

## Migration Plan
- Implement SidebarDock and wire all sidebars through it.
- Update Explorer IPC + UI for scoped roots and preview.
