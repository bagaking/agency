# Change: Action Sheet Execution

## Why
Multiple flows are re-implementing the same pattern: create a short plan with checks, assemble a structured prompt, dispatch to a session, and wait for completion. A first-class Action Sheet makes this consistent, observable, and reusable.

## What Changes
- Introduce Action Sheets as a reusable execution unit (plan + checks + prompt + run state).
- Persist Action Sheets under `.agency/action-sheets/<id>/` with structured status files.
- Provide a conditional plugin to branch and loop until checks pass.
- Add UI to track Action Sheet status and jump to the active session/terminal.

## Impact
- Affected spec: agency-editor
- Affected UI: Workbench/Actions/HIL execution panels
- Affected services: action execution, gating, session dispatch, runtime logging
