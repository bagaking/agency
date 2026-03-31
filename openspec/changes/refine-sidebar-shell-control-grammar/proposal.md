# Change: Refine Sidebar Shell Control Grammar

## Why
The current sidebar experience is split across multiple affordance grammars.

The left docked sidebar still relies on `SidebarDock` edge/handle controls, while the session reply relay already uses a rail-owned collapsed icon pattern. At the same time, the top header areas for Explorer and Memo carry too much explanatory copy and too many repeated labels, so they no longer meet the repo interaction-design bar for concise, legible chrome.

## What Changes
- Move docked-left-sidebar collapse/expand ownership to the shell-level activity bar instead of per-surface dock handles.
- Keep `SidebarDock` responsible for width and resize only.
- Tighten Explorer and Memo side-surface headers so they prioritize current context and state over redundant subtitles and repeated labels.
- Update current spec and supporting docs to record the shared sidebar-control contract and the more compact side-surface header grammar.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/ActivityBar.tsx`
  - `apps/editor/renderer/src/components/layout/SidebarDock.tsx`
  - `apps/editor/renderer/src/components/explorer/ExplorerHeader.tsx`
  - `apps/editor/renderer/src/components/hil/memo/HilMemoSidebar.tsx`
  - related renderer tests and docs
