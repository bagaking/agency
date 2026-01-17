# Change: Add terminus-settings for terminal input behavior

## Why
Terminal input interception is causing inconsistent CLI behavior (e.g., Shift+Enter, scroll). We need explicit, configurable shortcuts and a baseline terminal profile with no implicit interception.

## What Changes
- Introduce a new terminus-settings configuration with Global/Project/Agent scopes.
- Define a non-deletable baseline terminal profile for plain shell sessions.
- Default shortcut bindings are empty; only configured bindings are intercepted.
- Add a structured input-action dispatcher to support future "send keys" automation.

## Impact
- Affected specs: agency-editor
- Affected code: terminal input handling, Terminus configuration (Hierarchy), settings storage/IPC
