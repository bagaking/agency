# Change: Add Commander Smart Session Actions

## Why
The current Agent Cells session context menu exposes direct session actions such as `Sub Terminal`, `Fork`, and `Rename Session`, but it does not distinguish between:
- deterministic local actions that are always available; and
- Commander-backed actions that depend on the Harness provider being correctly configured and currently reachable.

This causes two product problems:
- users can trigger a "smart" flow such as Fork without a clear signal that the Commander backend is the execution owner;
- users have no lightweight Commander-backed action to validate the Harness path on a bounded, low-risk workflow such as session naming.

## What Changes
- Add Commander-backed smart session actions to the Agent Cells session context menu:
  - `Smart Fork [by commander]`
  - `Smart Name [by commander]`
- Gate both actions behind a shared Commander readiness check:
  - required Harness provider settings are complete; and
  - the Commander backend/provider path is currently reachable.
- Gate `Smart Fork [by commander]` behind an additional session suitability check so shell or otherwise unsupported source sessions do not expose a smart-fork action that can only deterministically fail.
- Keep non-Commander local actions available regardless of Commander readiness:
  - `Create Sub Terminal`
  - local/manual `Rename Session`
  - other existing non-Commander actions.
- Route `Smart Fork [by commander]` through the existing Harness `Create Agent` specialization path instead of renderer-local logic.
- Add a new bounded Commander-backed naming flow that suggests a context-derived session name and applies the chosen result through the existing session rename path.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - Agent Cells session context menu UI
  - renderer session action wiring / Commander readiness state
  - Harness provider readiness probe / state surface
  - new Commander-backed smart-name flow
  - existing Harness-backed smart-fork entry
- Risks:
  - adding a real readiness probe can create menu flicker or stale availability state if the probe contract is weak;
  - users may confuse local rename with Commander smart naming unless the menu labels and availability are explicit.
- Mitigation:
  - keep Commander actions visually labeled with `[by commander]`;
  - define one shared readiness contract used by both smart actions;
  - keep the naming flow bounded and low-risk so it can serve as a reliable Harness validation path.
