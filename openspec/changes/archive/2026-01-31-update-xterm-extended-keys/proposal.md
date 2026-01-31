# Change: Upgrade xterm and preserve extended keyboard input

## Why
Shift+Enter and other modifier-specific keys are collapsed to plain Enter in the embedded terminal, which strips input fidelity and degrades third-party CLI behavior.

## What Changes
- Upgrade the embedded terminal dependency from `xterm` to `@xterm/xterm` (latest compatible version).
- Add a custom key handler to emit bracketed-paste newline when enabled, falling back to CSI-u (`\x1b[13;2u`) for Shift+Enter when no shortcut binding matches.
- Preserve modifier-specific key sequences end-to-end so CLI tools receive the intended input.
- Add verification coverage and record findings in an experience note.
- Update the terminal skill documentation to `bagaking-xterm-skills`.

## Impact
- Affected specs: `agency-editor`
- Affected code: `apps/editor/renderer/src/terminal/terminalManager.js`, `apps/editor/renderer/src/App.jsx`, `apps/editor/renderer/src/components/TerminalPane.jsx`, `apps/editor/renderer/src/terminal/terminalInputDispatcher.js`, `apps/editor/package.json`, `apps/editor/pnpm-lock.yaml`
- Affected docs/skills: new terminal experience note, `.codex/skills/bagaking-xterm-skills/`
