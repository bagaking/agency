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
- Enable tmux extended keys (`xterm-keys`/`extended-keys`) so modifier arrows survive tmux.
- Preserve mouse selection on release; floating action bar shows Reply/Memo/Send (Copy removed; use `Cmd+C`).
- Keep tmux mouse **on** by default so TUI mouse/scroll works; use modifier to force local selection.
- While a local selection exists, keep tmux mouse **off** until selection is cleared, so `Cmd` word-select and drag-select remain stable.
- Scroll defaults to TUI when mouse reporting is enabled; `Option/Alt + wheel` forces local scrollback.
- Command + Left/Right sends Home/End (`CSI H/F`) to align with native macOS terminal behavior.
- Option/Alt + 左右箭头发送 `ESC b/f` 以支持按词跳转；Ctrl + 箭头发送 `CSI 1;5` 序列。
- Cmd+Click on terminal paths opens files in the workbench (supports `:line[:col]` and trims trailing punctuation), and reveals the file in the explorer tree; ranges use xterm column maps so CJK/fullwidth text stays accurate.

See `docs/notes-terminal-interaction-requirements.md` for first-principles rationale and competitive analysis.

## Why
Shift+Enter was previously emitted as plain Enter (`\r`) due to xterm's default keyboard mapping, which strips modifier intent for CLI tools that support multi-line input.

## Implementation Notes
- Custom key handler intercepts Shift+Enter and sends the bracketed-paste newline when enabled (`\x1b[200~\n\x1b[201~`), falling back to CSI-u (`\x1b[13;2u`).
- “Intercept” here means we `preventDefault` so the plain Enter (`\r`) is not emitted; only the custom sequence is sent.
- User shortcut bindings take priority; Shift+Enter handling only runs when no binding matches.
- Shift+Enter suppression covers keydown/keypress/keyup to avoid leaking a plain Enter after the custom sequence.
- Skip custom key handling during IME composition events (`isComposing`/`Process`/`Dead`) to avoid breaking CJK input.
- Also skip custom key handling on IME keyCode 229 / `Unidentified` to avoid CJK input regressions.
- Shift+Arrow is no longer intercepted; modifier key sequences pass through to xterm defaults.
- Command + Left/Right emits `\x1b[H`/`\x1b[F` for line start/end jumps on macOS.
- Option/Alt + Left/Right emits `\x1bb`/`\x1bf` for readline-style word jump; Ctrl + Arrow emits `\x1b[1;5A/B/C/D`.
- Selection persists after mouse release; when selection exists, `Cmd+C` copies it and the floating action bar allows Reply/Memo/Send.
- To keep both scroll and selection, Agency keeps tmux mouse **on** by default and uses modifier-drag to temporarily disable mouse for selection.
- Selection enters a short-lived "mouse lock": tmux mouse stays **off** while selection exists, then turns back **on** only after the selection is cleared.
- `Cmd` selection uses a short activation guard (~180ms) after pointer release so delayed selection events are not dropped.
- Cmd+Click on terminal paths opens the file in the workbench (line/column aware) and reveals it in the explorer tree; link ranges use xterm `outColumns` to stay aligned with wide/CJK characters.
- Wheel handling defaults to TUI when mouse tracking is enabled; `Option/Alt + wheel` forces local scrollback. When mouse tracking is disabled and the alternate buffer is active, wheel events emit PageUp/PageDown to support TUI scrolling (e.g., tmux copy-mode, less).

## 鼠标/选中策略
- Session attach 后保持 tmux mouse **开启**，优先保证 TUI 鼠标交互与滚动可用。
- `Shift` / `Command` / `Option/Alt` + 拖拽时临时关闭 tmux mouse，用 xterm 本地选区以支持 Reply/Memo/Send（Command 通过终端侧强制选区覆盖实现）。
- 只要本地选区仍存在，tmux mouse 保持关闭；选区清空后再恢复 tmux mouse。
- `Option/Alt + 滚轮` 强制本地 scrollback；默认滚轮交给 TUI。

## 折行与预览对齐经验（xterm vs tmux）
- `tmux capture-pane` 返回的是 **已渲染的网格快照**，文本已被硬折行，且折行宽度取决于 tmux 当时的 pane 宽度。
- 即便加 `-J`（join wrapped），也只能合并 tmux 标记为软折行的行；对 CJK 宽字符或某些 TUI 输出，wrap 标记可能不可靠，仍会出现“硬折行”。
- Agent Cell 之所以对齐，是因为渲染层直接消费 PTY 流并由 xterm 维护 `isWrapped` 标记；**要与 Agent Cell 预览一致，优先使用 xterm buffer snapshot**（按 `isWrapped` 合并）。
- 如果 session 没有在渲染层打开，只能退化使用 `capture-pane`；要彻底一致需要引入 tmux `pipe-pane` 或其它“原始输出流”记录。

## Manual Verification
1. Open a terminal session in Agency.
2. Run `cat -v` to visualize control sequences.
3. Press Enter: expect `^M`.
4. Press Shift+Enter:
   - If bracketed paste mode is enabled, expect `^[[200~` + newline + `^[[201~`.
   - Otherwise, expect `^[[13;2u`.
5. Press Command + Left/Right: expect `^[[H` / `^[[F` (line start/end).
6. Exit `cat -v` with `Ctrl+C`.
7. Validate in CLI tools (e.g., `codex`, `claude`) that Shift+Enter inserts a newline instead of submitting.
8. Drag to select terminal text; selection should remain after mouse release.
9. Confirm the floating action bar shows Reply/Memo/Send only (no Copy).
10. Press `Cmd+C` with selection; selection copies to clipboard (paste elsewhere).
11. Run `printf '行为说明。docs/notes-terminal-keyboard.md:11\n'` and Cmd+Click the path; it opens in the workbench at line 11 and reveals in explorer.
12. Open a TUI (e.g., `less` or `htop`) and confirm mouse scroll works by default.
13. Hold `Shift` / `Command` / `Option/Alt` and drag to select text; confirm selection works and actions appear.
14. Hold `Option/Alt` and scroll; confirm local scrollback moves without affecting the TUI.
15. Use `Cmd+Click` for word selection and then `Cmd+Drag` for a new selection; confirm the new selection does not revert to the old range.

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
- If an app relies on mouse tracking (e.g., TUI click), the default policy keeps mouse tracking on; selection uses modifier drag which temporarily disables mouse reporting.
