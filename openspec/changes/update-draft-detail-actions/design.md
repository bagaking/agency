# Design: Draft Detail Actions

## Draft Confirmation
- Archive/delete actions use the global modal system.
- Cancel leaves Draft state unchanged.

## Draft → Action Sheet Creation
- When a Draft has no `actionSheetId`, Draft detail shows a “Create Action Sheet” control.
- Creation uses the Draft body as the prompt requirements/context (exact mapping to be decided in implementation).
- The created Action Sheet id is stored on the Draft metadata (`meta.actionSheetId`).
- Draft detail immediately renders the Action Sheet status panel once linked.
