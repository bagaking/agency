> Superseded by `refactor-commander-unified-station`.
>
> This change captured a later Commander presentation slice, but the canonical Commander plan now lives under the unified station change.
>
> The detailed body below intentionally preserves obsolete popup/drawer wording and MUST NOT be treated as the current Commander source of truth.

# Change: Optimize Session Map Commander As Right-Edge Drawer

## Why
The current Commander implementation is functionally correct, but the interaction still reads as a nested popup inside the Session Map surface. That makes the backend/operator entry feel secondary, and it keeps the user mentally inside a "small floating card" instead of a stable command station.

The product opportunity is to strengthen Commander without turning it into a global chat system:
- move the Commander identity to the far-right edge of the docked Session Map so it reads as the primary backend entry;
- replace the popup feeling with a full-height right-edge drawer that feels anchored and inspectable;
- keep the experience scoped to Session Map so it stays evidence-bound to current session/run context instead of competing with HIL or Session Reply.

## What Changes
- Reposition the Commander identity to the far-right edge of the docked Session Map operational cluster.
- Present Commander as a Session Map-scoped right-edge drawer instead of a floating popup.
- Keep `Command Ops` as the persistent evidence rail, with the Commander drawer opening from the same right-side station.
- Preserve current Commander context binding to focused session, Harness run, and visible operational error state.
- Explicitly avoid upgrading Commander into a window-global assistant drawer in this change.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/sessionMap/SessionMapOverlay.tsx`
  - `apps/editor/renderer/src/components/sessionMap/SessionMapDockLayout.tsx`
  - `apps/editor/renderer/src/components/sessionMap/SessionMapCommanderPopup.tsx`
  - `apps/editor/renderer/src/components/sessionMap/SessionMapCommanderDialog.tsx`
  - `docs/notes-session-management.md`
- Risks:
  - the right side can become visually crowded if Commander and Ops compete for attention;
  - a drawer that looks too global may confuse users into expecting cross-view chat behavior.
- Mitigation:
  - keep Commander visually attached to Session Map chrome and right rail;
  - preserve evidence-bound copy and scoped behavior;
  - do not reuse the app-level right-side drawer patterns used for HIL/Reply.
