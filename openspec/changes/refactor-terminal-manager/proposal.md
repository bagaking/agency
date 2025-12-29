# Change: Refactor terminal lifecycle management

## Why
Terminal tabs can render blank when switching quickly because xterm instances are recreated or attached before layout stabilizes. We need a more resilient terminal lifecycle that persists sessions and avoids zero-dimension initialization.

## What Changes
- Introduce a renderer-side Terminal Manager that owns xterm instances per session.
- Render inactive terminals as hidden layers (visibility/opacity) instead of unmounting them.
- Gate terminal start/attach to be idempotent and resilient to rapid tab switches.
- Add cleanup for terminated sessions to prevent resource leaks.

## Impact
- Affected specs: agency-editor (terminal/session requirements)
- Affected code: renderer terminal components, session switching flow
