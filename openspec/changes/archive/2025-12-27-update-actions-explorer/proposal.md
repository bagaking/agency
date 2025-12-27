# Change: Update Actions Configuration in Explorer

## Why
Quick actions are configured in a separate view with an internal scope selector, which makes scope boundaries and inheritance unclear.
We need to surface Global / Project / Agent actions directly in the Explorer and show how defaults and overrides are applied.

## What Changes
- Add Global / Project / Agent actions entries in Explorer
- Add Agent-level action overrides and resolve actions by Global -> Project -> Agent
- Show inheritance and override state clearly in the actions configuration UI
- Start actions create a new session before running

## Impact
- Affected specs: agency-editor
- Affected code: renderer Sidebar/QuickActionsView, actions merge logic, quick actions storage
