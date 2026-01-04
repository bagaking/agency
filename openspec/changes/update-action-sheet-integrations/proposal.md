# Change: Action Sheet Integrations

## Why
Action Sheets are now the reusable execution unit, but key entrypoints (Explorer feed and HIL Promote) still dispatch prompts directly. Integrating these flows ensures consistent tracking, gating, and recovery.

## What Changes
- Explorer feed creates an Action Sheet from the selection + description and dispatches via the Action Sheet runner.
- HIL Promote creates/links an Action Sheet and synchronizes its status with the promote gate.
- Promote UI surfaces the linked Action Sheet state and provides a jump to the Action Sheet panel.

## Impact
- Affected spec: agency-editor
- Affected UI: Explorer footer, Promote modal, Hierarchy Action Sheets
- Affected services: action sheet runner integration
