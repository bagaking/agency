# Change: Add terminus-settings for terminal input behavior

## Why
Terminal input interception is causing inconsistent CLI behavior (e.g., Shift+Enter, scroll). We need explicit, configurable shortcuts and a baseline terminal profile with no implicit interception. The current shortcut UX also mixes app-level actions with terminal input actions, which makes scope unclear and leads to confusing behavior.

## What Changes
- Separate App Shortcuts (application-level actions like screenshot/voice) from Terminus shortcuts (terminal input actions).
- Introduce a new App Shortcuts configuration with Global/Project/Agent scopes.
- Keep Terminus settings in Global/Project/Agent scopes, but move terminal input shortcuts under Terminus profiles.
- Define a non-deletable baseline terminal profile for plain shell sessions.
- Default terminus shortcut bindings are empty; only configured bindings are intercepted.
- Keep a structured input-action dispatcher to support "send keys" automation.
- App Shortcuts UI uses a VSCode-style layout: fixed action list on the left and per-action config on the right (no "Add" flow).

## Impact
- Affected specs: agency-editor
- Affected UI: Hierarchy navigation (new App Shortcuts view), Terminus view (per-profile shortcuts)
- Affected code: terminal input handling, Terminus configuration, new App Shortcuts storage/IPC
