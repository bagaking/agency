# Change: Add Attention Layer

## Why
Agency already has a stable canonical object model and bounded operator surfaces, but users still need to visually scan multiple surfaces to discover what needs intervention. In multi-window, multi-cell, multi-session, and multi-run workflows, that forces guesswork instead of explicit routing.

## What Changes
- Add a canonical renderer attention layer over `Window / Cell / Session / Run`.
- Define shared attention states for running, failed, pending confirmation, unread, and return-required conditions.
- Surface attention consistently in Session Map, Agent Cells, shell chrome, and window switching.
- Add jump paths from attention items to the owning object instead of passive status-only badges.
- Persist a minimal window attention summary so other windows can advertise urgency through the existing window shell.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/shared/`
  - `apps/editor/renderer/src/attention/`
  - `apps/editor/renderer/src/components/sessionMap/`
  - `apps/editor/renderer/src/components/agentCells/`
  - `apps/editor/renderer/src/components/StatusBar.tsx`
  - `apps/editor/renderer/src/components/WindowTitleBar.tsx`
  - `apps/editor/electron/services/windowShell.ts`
  - `apps/editor/electron/services/uiState.ts`
