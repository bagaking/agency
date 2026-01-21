---
name: bagaking-xterm-skills
description: Terminal rendering and keyboard input handling for Agency using @xterm/xterm. Use when modifying xterm setup, keyboard shortcuts/extended key sequences, tmux-backed terminal behavior, or debugging input fidelity (e.g., Shift+Enter, modifier keys).
---

# Bagaking Xterm Skills

## Overview
Guide for Agency's xterm integration: initialization, input dispatch, shortcut handling, tmux sessions, and preserving modifier-aware key sequences.

## Core Capabilities
### 1. Trace the Terminal Input Path
- Renderer terminal setup: `apps/editor/renderer/src/terminal/terminalManager.js`.
- UI input/shortcuts and custom key handling: `apps/editor/renderer/src/components/TerminalPane.jsx`.
- Shortcut/clipboard actions: `apps/editor/renderer/src/terminal/terminalInputDispatcher.js`.
- IPC bridge to backend: `apps/editor/electron/preload.js` -> `terminal:write` in `apps/editor/electron/ipc/handlers/terminal.js`.

### 2. Maintain Keyboard Fidelity (Extended Keys)
Use xterm's custom key event handler to preserve modifier-aware sequences when needed.

Recommended pattern for Shift+Enter:
- Detect `event.key == 'Enter' && event.shiftKey` and send CSI-u sequence: `\x1b[13;2u`.
- Return `false` to prevent the default Enter (`\r`) from being emitted.
- Respect user shortcuts first (only apply when no binding matches).

Notes:
- xterm default mapping does not differentiate Shift+Enter; it emits `\r`.
- Avoid applying custom handling when user-defined shortcut bindings already match.
- Keep behavior opt-in or scoped if specific CLI tools cannot parse CSI-u.

### 3. Keep Terminal Defaults Stable
- Shell-first behavior stays in `apps/editor/renderer/src/App.jsx` (do not auto-run CLI).
- Do not change `convertEol` for tmux sessions unless explicitly required.
- Preserve existing resize/fit logic to avoid tmux redraw issues.

## Workflow Checklist
1. Confirm xterm package and CSS import paths:
   - `@xterm/xterm` in `apps/editor/package.json`.
   - CSS import in `apps/editor/renderer/src/App.jsx`.
2. Update terminal initialization options (if needed) in `terminalManager.js`.
3. Implement modifier-aware key sequences in `TerminalPane.jsx` (custom key handler).
4. Verify shortcuts, paste, and key handling in a live terminal session.
5. Document behavior in the terminal experience note.
