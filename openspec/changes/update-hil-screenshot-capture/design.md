# Design: HIL Screenshot Capture UI

## UX Flow
1. User clicks Capture in the Screenshot section.
2. App opens a full-screen capture overlay.
3. User drags to select a region.
4. User annotates (rectangle, arrow, text, highlight) and confirms.
5. App saves the PNG and returns to Memo, showing preview.

## Implementation Outline
- Use Electron desktopCapturer to grab screen sources.
- Render a dedicated capture window/overlay with a canvas.
- Provide minimal annotation tools (rectangle, arrow, text, highlight) and undo.
- On confirm, export a PNG and save under `.agency/hil/assets/<worktree>/`.
- Store asset metadata on the memo item (`path`, `width`, `height`, `mime`).

## Compatibility
- No changes to the HIL index schema beyond existing asset metadata fields.
- Clipboard capture can be retained as a fallback if capture fails (optional).
