# Change: Add session runtime orchestration gateway

## Why
`Fork` currently only means "create a child session node and inherit the parent profile". That is enough for topology, but it is not enough for tool-specific workflows like Codex, where a real fork requires source-side state checks, an in-TUI `/fork` action, extraction of fork metadata such as `thread_id`, and a coordinated child-session launch.

If we implement that workflow ad hoc in renderer components, the result will be brittle, hard to test, and impossible to reuse when Agency later wants a main-process "negotiator" / harness agent to coordinate session-level operations. The project needs one host-owned session runtime orchestration layer that can power UI actions now and future tool/CLI/harness callers later.

## What Changes
- Add a main-process-owned session runtime orchestration gateway for deterministic session inspection, input dispatch, wait conditions, child-session creation, and higher-level orchestration intents.
- Implement driver-based smart fork orchestration, with Codex as the first driver.
- Extend resolved Terminus profile data with optional smart fork settings (driver, launch template, timeouts) so tools can declare their fork behavior without pushing raw tmux logic into the UI.
- Package the gateway behind JSON-friendly IPC and CLI/tool wrappers, following the same thin-wrapper pattern used by file intents.
- Clarify the documentation surface:
  - what ships in this change;
  - which existing session abilities are being promoted into atomic reusable building blocks;
  - how the design leaves a clean seam for a future Main-as-Agent harness without committing to a free-form agent now.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/electron/services/tmux.ts`
  - `apps/editor/electron/services/terminal.ts`
  - `apps/editor/electron/services/sessions.ts`
  - new session runtime/orchestration services + IPC/CLI wrappers
  - `apps/editor/renderer/src/hooks/useSessions.ts`
  - `apps/editor/renderer/src/components/agentCells/AgentCellsSessionsPanel.tsx`
  - Terminus profile config/editor surfaces
  - `apps/editor/README.md`
  - `apps/editor/docs/manual-test.md`
  - `docs/notes-session-management.md`
  - `docs/notes-reusable-items-coding.md`
- Risks:
  - smart fork heuristics can be tool-fragile if source/ready detection is underspecified;
  - mixing low-level tmux helpers with orchestration logic can produce another monolith instead of a reusable host contract;
  - exposing the wrong boundary now can make future Main-as-Agent evolution expensive.
- Mitigation:
  - land this in layers: host primitives first, Codex driver second, adapters/docs last;
  - keep the external contract JSON-friendly and host-owned;
  - require structured failure codes and driver fixtures for parsing/ready-state logic.
