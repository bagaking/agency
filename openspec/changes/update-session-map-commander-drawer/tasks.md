## 1. Spec And Docs
- [x] 1.1 Add `agency-editor` requirements for right-edge Commander entry placement and Session Map-scoped drawer presentation.
- [x] 1.2 Update `docs/notes-session-management.md` to describe the drawer presentation and continued Session Map scope.

## 2. Renderer UX
- [x] 2.1 Move the Commander identity/trigger to the far-right edge of the docked Session Map operational station.
- [x] 2.2 Replace the floating Commander popup presentation with a full-height right-edge drawer inside Session Map.
- [x] 2.3 Keep `Command Ops` readable and stable when Commander is closed or open.
- [x] 2.4 Preserve keyboard dismissal, context rebinding, and bounded quick actions in the new drawer form.

## 3. Verification
- [x] 3.1 Verify Commander still binds to focused session, active Harness run, and visible session error.
- [x] 3.2 Verify the drawer never appears outside Session Map and does not reuse HIL / Reply drawer semantics.
- [x] 3.3 Run targeted renderer tests or manual verification for open/close behavior, right-edge placement, and Ops continuity.
