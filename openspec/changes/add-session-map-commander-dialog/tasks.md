## 1. Spec And Interaction Model
- [x] 1.1 Add `agency-editor` requirements for the Commander dialog entrypoint, right-rail presentation, and scope.
- [x] 1.2 Define how Commander dialog composes with `Command Ops` in docked Session Map.
- [x] 1.3 Define Commander dialog boundaries versus Session Reply and generic assistant chat.

## 2. Renderer UX
- [x] 2.1 Make the `Commander` avatar/identity clickable in Session Map dock.
- [x] 2.2 Add right-rail Commander dialog open/close/toggle state and layout behavior.
- [x] 2.3 Implement a compact commander conversation UI with context header, history, composer, and bounded quick prompts/actions.

## 3. Backend Context And Actions
- [x] 3.1 Define a bounded commander request/response contract grounded in current session and Harness facts.
- [x] 3.2 Feed current focus session, active Harness run, and latest error/timeline context into the dialog.
- [x] 3.3 Ensure any imperative Commander actions route through approved host-managed capabilities instead of ad-hoc renderer logic.

## 4. Verification And Docs
- [x] 4.1 Add manual verification for opening Commander dialog, preserving context binding, and explaining current/failed runs.
- [x] 4.2 Update `docs/notes-session-management.md` with Commander dialog semantics and hierarchy.
