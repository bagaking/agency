## 1. App Shortcuts Configuration & Storage
- [x] 1.1 Define the fixed App Shortcuts action catalog (screenshot, quick voice, etc.).
- [x] 1.2 Implement Global/Project/Agent storage paths for app-shortcuts.
- [x] 1.3 Add IPC endpoints and renderer bridge for reading/updating app-shortcuts.
- [x] 1.4 Resolve App Shortcuts by scope (Global -> Project -> Agent).

## 2. Terminus Settings (Profile Shortcuts)
- [x] 2.1 Update terminus-settings schema to store shortcuts per profile.
- [x] 2.2 Update load/save/merge to apply shortcuts for the active profile only.
- [x] 2.3 Keep the baseline terminal profile visible and non-deletable.
- [x] 2.4 Default Terminus shortcuts are empty; no implicit interception.

## 3. UI: App Shortcuts (Hierarchy)
- [x] 3.1 Add a new Hierarchy entry for App Shortcuts.
- [x] 3.2 Render a VSCode-style layout: action list on the left, config on the right.
- [x] 3.3 Prevent manual add/remove; users only configure predefined actions.
- [x] 3.4 Surface scope path + override status for selected action.

## 4. UI: Terminus
- [x] 4.1 Update Terminus view to edit shortcuts per profile.
- [x] 4.2 Highlight which profile is active and which shortcuts apply.
- [x] 4.3 Keep profile editing (label/start/resume) intact after refactor.

## 5. Terminal Input Pipeline
- [x] 5.1 Remove default keyboard interception unless a binding is configured.
- [x] 5.2 Route configured shortcuts through an input-action dispatcher.
- [x] 5.3 Align scroll behavior with VSCode: scrollback in normal buffer, pass through in alternate buffer.
- [x] 5.4 Match shortcut bindings only from the active profile.

## 6. Validation
- [x] 6.1 Manual: App Shortcuts render as fixed action list + right panel config.
- [x] 6.2 Manual: App Shortcut override resolves by scope.
- [x] 6.3 Manual: Terminus profile-specific shortcut fires only for active profile.
- [x] 6.4 Manual: Codex Shift+Enter behaves like native terminal without configured binding.
- [x] 6.5 Manual: TUI scroll works in alternate buffer; scrollback works in normal buffer.
- [x] 6.6 Manual: configured shortcut fires and sends expected key sequence.
