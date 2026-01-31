---
title: Terminal Keyboard Notes
required: false
sop:
  - When changing terminal keyboard sequences, update this doc and regenerate docs/must-sop.md.
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
- “Intercept” here means we `preventDefault` so the plain Enter (`\r`) is not emitted; only the custom sequence is sent.
- User shortcut bindings take priority; Shift+Enter handling only runs when no binding matches.
- Shift+Enter suppression covers keydown/keypress/keyup to avoid leaking a plain Enter after the custom sequence.
- Wheel handling defaults to terminal scrollback; when mouse tracking is enabled, wheel events pass through to the app (hold `Alt` to force scrollback).
- Agency enables tmux mouse for managed sessions so trackpad/scroll wheels are forwarded to tmux for scrollback.
- When in the alternate buffer without mouse tracking, wheel events emit PageUp/PageDown to support TUI scrolling (e.g., tmux copy-mode, less).

## tmux 原生体验一致性（滚动行为）
- Agency 终端基于 tmux 会话；要与原生终端一致，滚动应由 tmux copy-mode 接管而不是 xterm scrollback。
- 不能依赖用户 `~/.tmux.conf`，必须在每个 session 创建/复用时显式 `set -t <session> mouse on`。
- 若 mouse 未开启，滚轮可能只影响输入区或没有历史滚动，体验会显著偏离原生终端。
- `Alt/Option + 滚轮` 作为兜底强制走 xterm scrollback（在需要时可用）。

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
- Agent Cell terminals run inside tmux; when the active buffer is alternate (full-screen apps), scrollback can be unavailable unless the app responds to PageUp/PageDown.
- If an app relies on mouse tracking, use `Alt+wheel` to force scrollback instead of passing wheel events through.
