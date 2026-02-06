## Context
The terminal selection menu should be elevated and focus on workflow actions (send/memo) rather than raw copy. Idle tracking should reflect real content change volume, not incidental focus or redraw noise.

## Goals / Non-Goals
- Goals:
  - Provide a more advanced floating selection action UI.
  - Offer Send-to-Session and Create Memo as primary actions.
  - Keep Cmd+C copy available but remove Copy from the floating menu.
  - Update idle activity only when output changes exceed a character threshold.
- Non-Goals:
  - Full command palette implementation.
  - Changing memo schema or HIL storage format.
  - Reworking tmux attach/GC logic beyond idle timestamps.

## Decisions
- Decision: Floating selection UI becomes a compact “action card” (frosted glass, multi-row) with selection stats and two primary actions.
  - Rationale: fits existing tactical UI while feeling more premium.
- Decision: Copy is removed from the floating UI. Cmd+C remains for power users.
  - Rationale: menu should bias toward workflow routing rather than clipboard.
- Decision: Create Memo writes a flash memo with `noteType: flash`, `source: terminal-selection`, and anchors the cell/session metadata.
  - Rationale: fast capture without opening a modal.
- Decision: Idle activity updates only when visible output change count exceeds a threshold (default 12 chars).
  - Rationale: filters cursor blinks, prompt redraws, and attach noise.
- Decision: Threshold is stored in session map config as `activityDiffThreshold` (project-level) and used by both backend diff checks and renderer output gating.

## Implementation Notes
- Terminal selection actions live in `apps/editor/renderer/src/components/TerminalPane.jsx`.
- Memo creation uses `useHilMemoCaptureState` -> `createHilItem` with a lightweight anchor object.
- Backend activity check in `apps/editor/electron/services/sessions.js` should update preview cache on any change but only advance `lastActivityAt` when diff >= threshold.
- Renderer should only call `updateSessionActivity` after output delta >= threshold to avoid idle flapping on session switches.

## Risks / Trade-offs
- Removing Copy from the menu may reduce discoverability; Cmd+C remains.
- Output diff threshold may delay idle updates for very small outputs.

## Migration
- Add `activityDiffThreshold` to session-map config with a default value.
- Existing configs load with default threshold when the field is missing.
