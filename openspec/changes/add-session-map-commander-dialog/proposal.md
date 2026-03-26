# Change: Add Session Map Commander Dialog

## Why
The current `Commander` block in docked Session Map communicates backend identity and coarse run status, but it is still effectively a status ornament. Users can inspect `Command Ops`, yet they cannot directly ask the backend for contextual help such as:
- what the current Harness run is doing;
- why a recent `Fork` failed;
- what the next recommended action is for the focused session.

Agency already has the right architectural ingredients for a bounded interaction surface:
- Session Map as the global cross-session navigation HUD;
- Main Agent Harness as the host-owned orchestration control plane;
- `Command Ops` as the observable evidence panel for runs, failures, and quick actions.

The next product step is not to add a generic free-form chat widget. It is to add a Commander dialog that stays explicitly grounded in current session/run facts and routes any imperative actions through approved host-managed capabilities.

## What Changes
- Add a clickable `Commander` identity in docked Session Map that opens a popup `Commander Dialog` over Session Map.
- Define the dialog as a bounded backend conversation surface scoped to the current focus session and active Harness run when available.
- Keep `Command Ops` as the stable evidence/operations pane underneath; the Commander dialog appears as a separate popup instead of replacing that rail.
- Make the dialog clearly distinct from Session Reply:
  - Commander dialog is for backend orchestration/diagnostic interaction.
  - Session Reply remains session-to-session communication and memo-backed relay.
- Seed the Commander dialog with contextual prompts/actions such as:
  - explain current run status;
  - summarize latest failure;
  - recommend next action;
  - explicitly retry/cancel/inspect only through approved host-managed paths.
- Ensure Commander dialog responses prefer current Harness timeline, capability-call records, and session/runtime facts over vague generic assistant behavior.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/sessionMap/SessionMapCommanderPanel.tsx`
  - `apps/editor/renderer/src/components/sessionMap/SessionMapDockLayout.tsx`
  - `apps/editor/renderer/src/components/sessionMap/SessionMapCommandPanel.tsx`
  - new Session Map commander-dialog components/state wiring
  - `apps/editor/renderer/src/App.tsx`
  - `apps/editor/renderer/src/hooks/useSessions.ts`
  - Main Agent Harness surfaces that provide dialog context and bounded actions
  - `docs/notes-session-management.md`
- Risks:
  - users may confuse Commander dialog with Session Reply or with a generic open-ended agent chat;
  - an under-scoped implementation could bypass the Harness capability plane and leak raw tool/file/tmux behavior into UI chat;
  - the right rail could become visually noisy if dialog and `Command Ops` are not composed carefully.
- Mitigation:
  - make the dialog explicitly context-bound to current session/run;
  - keep orchestration actions routed through approved host-managed capabilities only;
  - co-locate dialog and `Command Ops` in one operational rail with clear hierarchy instead of adding another independent panel.
