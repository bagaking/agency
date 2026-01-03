# Change: Explorer UX, Tooltips, and Shortcuts

## Why
Explorer workflows feel slower than expected for an editor: file edits rely on a commit-style save button, icon actions lack hover affordances, and comment indicators are not actionable.
Users expect common keyboard shortcuts and consistent UI feedback aligned with the rest of the app.

## What Changes
- Add common editor keyboard shortcuts (save, save-as, close tab, find/replace) and wire them to workbench actions.
- Introduce a shared tooltip component for icon-only controls and apply it across Explorer UI actions.
- Align Explorer header/footer palette with the rest of the app’s muted/foreground theme.
- Replace the comment dot indicator with a comment icon that navigates to HIL comments for that file.

## Impact
- Affected spec: agency-editor
- Affected UI areas: Explorer sidebar, Workbench tabs, HIL drawer
- Affected systems: workbench command wiring, HIL comment navigation
