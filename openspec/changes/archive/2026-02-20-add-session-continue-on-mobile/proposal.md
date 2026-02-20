# Change: Add Session "Continue on Mobile"

## Why
Agency sessions are tmux-backed, but users currently have no direct UI flow to continue a running session from a phone. This creates friction for long-running tasks outside the desktop.

## What Changes
- Add a per-session "Continue on Mobile" action in Agent Cells session context menu.
- Add a new Electron IPC capability to prepare mobile continuation payloads for a session.
- Build SSH+tmux attach commands using discovered host/port/session data.
- Attempt best-effort SSH channel enablement when no listening SSH port is detected, then re-run port discovery.
- Copy the generated command to clipboard and surface readiness/manual-next-step feedback in the renderer.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/electron/services/*` (session/mobile continuation + SSH discovery)
  - `apps/editor/electron/ipc/handlers/sessions.ts`
  - `apps/editor/electron/preload.ts`
  - `apps/editor/renderer/src/services/agencyBridge.ts`
  - `apps/editor/renderer/src/hooks/useSessions.ts`
  - `apps/editor/renderer/src/components/SessionMenus.tsx`
  - Agent Cells layout wiring files (`App.tsx`, `build*LayoutProps.ts`, `AppLayout.tsx`, `AgentCellsSidebar.tsx`, `AgentCellsSessionsPanel.tsx`)
  - docs (`docs/notes-session-management.md`, `docs/notes-reusable-items-coding.md`)
