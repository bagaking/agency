# Design: HIL Screenshot Capture UI

## UX Flow
1. User clicks Capture in the Screenshot section.
2. App opens a full-screen capture overlay.
3. User drags to select a region.
4. User annotates (rectangle, arrow, text, highlight) and confirms.
5. User chooses whether to include or hide Agency windows during capture.
6. App opens a routing panel to choose target (Project/Agent Cell) or Clipboard-only.
6. App saves the PNG and returns to Memo, showing preview (when routed to HIL).

## Implementation Outline
- Use Electron desktopCapturer to grab screen sources.
- Render a dedicated capture window/overlay with a canvas.
- Provide minimal annotation tools (rectangle, arrow, text, highlight) and undo.
- Allow toggling whether Agency windows are visible during capture.
- After capture, present a routing sheet with:
  - Target project/worktree + Agent Cell selection
  - Actions: Save to HIL, Copy to Clipboard, or Both
- On confirm, export a PNG and save under `.agency/hil/assets/<worktree>/`.
- Store asset metadata on the memo item (`path`, `width`, `height`, `mime`).
 - If Clipboard-only is selected, do not touch HIL.

## Multi-Window & Multi-Display
- Use a main-process Capture Manager singleton to guarantee a single active capture session.
- Capture requests include the originating window id and worktree path.
- Results are routed back to the originating window only.
- For multiple displays, spawn an overlay per display and map coordinates using display bounds and scale.
- Provide a capture option to hide Agency windows (default) or include them in the screenshot.

## Module Layout
- `electron/services/screenshotCapture/`
  - `captureManager.js`
  - `sourceGrabber.js`
  - `imageComposer.js`
- `electron/windows/captureOverlay/`
  - `overlayWindow.js`
  - `overlayPreload.js`
- `renderer/components/capture/`
  - `CaptureCanvas.jsx`
  - `CaptureToolbar.jsx`
  - `CaptureOverlay.jsx`
  - `CaptureRoutingSheet.jsx`
- `renderer/components/hil/memo/`
  - `HilMemoView.jsx` (composition)
  - `InboxSection.jsx`
  - `FlashCaptureCard.jsx`
  - `ExcerptCaptureCard.jsx`
  - `ScreenshotCaptureCard.jsx`

## Compatibility
- No changes to the HIL index schema beyond existing asset metadata fields.
- Clipboard capture can be retained as a fallback if capture fails (optional).
