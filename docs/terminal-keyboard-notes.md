---
title: Terminal Keyboard Notes
required: false
sop:
  - When changing terminal keyboard sequences, update this doc and regenerate docs/sop.md.
  - Validate Shift+Enter behavior using the manual verification checklist in this doc.
---

# Terminal Keyboard Protocol Notes

## Summary
- Upgraded embedded terminal to `@xterm/xterm` and kept shell-first defaults.
- Added modifier-aware Shift+Enter handling that prefers bracketed-paste newline, with CSI-u fallback.

## Why
Shift+Enter was previously emitted as plain Enter (`\r`) due to xterm's default keyboard mapping, which strips modifier intent for CLI tools that support multi-line input.

## Implementation Notes
- Custom key handler intercepts Shift+Enter and sends the bracketed-paste newline when enabled (`\x1b[200~\n\x1b[201~`), falling back to CSI-u (`\x1b[13;2u`).
- User shortcut bindings take priority; Shift+Enter handling only runs when no binding matches.
- Shift+Enter suppression covers keydown/keypress/keyup to avoid leaking a plain Enter after the custom sequence.
- Wheel handling defaults to terminal scrollback; when mouse tracking is enabled, wheel events pass through to the app (hold `Alt` to force scrollback).

## Manual Verification
1. Open a terminal session in Agency.
2. Run `cat -v` to visualize control sequences.
3. Press Enter: expect `^M`.
4. Press Shift+Enter:
   - If bracketed paste mode is enabled, expect `^[[200~` + newline + `^[[201~`.
   - Otherwise, expect `^[[13;2u`.
5. Exit `cat -v` with `Ctrl+C`.
6. Validate in CLI tools (e.g., `codex`, `claude`) that Shift+Enter inserts a newline instead of submitting.

## Verification Results (2025-02)
- `codex` CLI: Shift+Enter behaves like Enter (submit), CSI-u appears unhandled.
- `claude` CLI: Shift+Enter produced no visible effect (CSI-u appears unhandled).

## Debugging Flow (E2E/Playwright)
This workflow is not documented elsewhere yet; keep it up to date when better techniques are discovered.
1. Start the renderer: `pnpm -C apps/editor dev:renderer`.
2. Read the renderer URL from the port file (default: `/tmp/agency-editor-renderer.json`).
3. Run Electron E2E with the URL: `ELECTRON_RENDERER_URL="http://localhost:<port>" pnpm -C apps/editor exec playwright test`.

## Caveats
- Some CLI tools may not parse CSI-u sequences; in those cases Shift+Enter may be ignored or treated as an unknown escape sequence.
- For CLIs without CSI-u support, recommend using their documented multi-line shortcut or standard Enter.
- Agent Cell terminals run inside tmux; when the active buffer is alternate (full-screen apps), scrollback can be unavailable, and wheel scrolling may appear to do nothing.
- If an app relies on mouse tracking, use `Alt+wheel` to send wheel events to the app instead of scrollback.
