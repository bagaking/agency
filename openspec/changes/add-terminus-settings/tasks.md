## 1. Configuration & Storage
- [ ] 1.1 Define the terminus-settings schema (baseline profile + shortcuts).
- [ ] 1.2 Implement Global/Project/Agent storage paths (no backward compatibility).
- [ ] 1.3 Add IPC endpoints and renderer bridge for reading/updating terminus-settings.

## 2. Terminus UI
- [ ] 2.1 Extend the Hierarchy Terminus view to edit terminus-settings.
- [ ] 2.2 Always surface the baseline terminal profile and prevent deletion.
- [ ] 2.3 Support scope overrides (Global -> Project -> Agent) for shortcuts.

## 3. Terminal Input Pipeline
- [ ] 3.1 Remove default keyboard interception unless a binding is configured.
- [ ] 3.2 Route configured shortcuts through an input-action dispatcher.
- [ ] 3.3 Align scroll behavior with VSCode: scrollback in normal buffer, pass through in alternate buffer.

## 4. Validation
- [ ] 4.1 Manual check: Codex Shift+Enter behaves like native terminal without configured binding.
- [ ] 4.2 Manual check: TUI scroll works in alternate buffer; scrollback works in normal buffer.
- [ ] 4.3 Manual check: configured shortcut fires and sends the expected key sequence.
