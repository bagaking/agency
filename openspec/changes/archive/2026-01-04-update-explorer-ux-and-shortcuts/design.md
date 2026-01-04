# Design: Explorer UX, Tooltips, and Shortcuts

## Keyboard Shortcuts
- Bind editor-level shortcuts in the workbench layer so they work across tabs.
- Wire save/save-as to existing file write paths; do not require UI button clicks.
- Keep shortcut handling centralized to avoid per-view duplication.

## Tooltip System
- Provide a lightweight tooltip component for icon-only actions with a consistent delay and palette.
- Use a single component across Explorer header/footer controls and any new icon-only buttons.

## Explorer Palette Alignment
- Align Explorer header/footer backgrounds, borders, and icon colors with the app’s muted/foreground tokens.
- Avoid hard-coded colors; prefer theme utility classes already used across the app.

## Comment Indicator Navigation
- Replace the dot indicator with a comment icon in file rows.
- Clicking the icon should open the HIL drawer and focus comments for that file.
- The icon should surface only when HIL comments exist for the file.
