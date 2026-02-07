# Change: Refactor High-Leverage Runtime Modules for TS Migration

## Why
The largest runtime modules (`useSessions`, `useVoiceCapture`, `AppLayout`, and associated view orchestration) have high cognitive load and broad regression surfaces. Direct TS migration without decomposition would be risky and expensive.

## What Changes
- Refactor high-leverage runtime modules into smaller reusable units while preserving behavior.
- Extract session runtime helpers from `useSessions` into dedicated modules.
- Extract voice-capture helpers from `useVoiceCapture` into dedicated modules.
- Split `AppLayout` view orchestration into composable layout/view components.
- Keep API contracts stable for existing callers.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/hooks/useSessions.js`
  - `apps/editor/renderer/src/hooks/useVoiceCapture.js`
  - `apps/editor/renderer/src/components/AppLayout.jsx`
  - newly extracted renderer hook/layout helper modules
- Risk: Medium (structural refactor on high-traffic modules).
