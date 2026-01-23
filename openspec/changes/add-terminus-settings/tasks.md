## 1. Configuration & Storage
- [x] 1.1 Define the terminus-settings schema (baseline profile + shortcuts).
- [x] 1.2 Implement Global/Project/Agent storage paths (no backward compatibility).
- [x] 1.3 Add IPC endpoints and renderer bridge for reading/updating terminus-settings.

## 2. Terminus UI
- [x] 2.1 Extend the Hierarchy Terminus view to edit terminus-settings.
- [x] 2.2 Always surface the baseline terminal profile and prevent deletion.
- [x] 2.3 Support scope overrides (Global -> Project -> Agent) for shortcuts.

## 3. Terminal Input Pipeline
- [x] 3.1 Remove default keyboard interception unless a binding is configured.
- [x] 3.2 Route configured shortcuts through an input-action dispatcher.
- [x] 3.3 Align scroll behavior with VSCode: scrollback in normal buffer, pass through in alternate buffer.

## 4. Validation
- [ ] 4.1 Manual check: Codex Shift+Enter behaves like native terminal without configured binding.
- [ ] 4.2 Manual check: TUI scroll works in alternate buffer; scrollback works in normal buffer.
- [ ] 4.3 Manual check: configured shortcut fires and sends the expected key sequence.
