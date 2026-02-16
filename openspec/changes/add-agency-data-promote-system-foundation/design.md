## Context
Agency currently stores real state under `.agency`, but the implementation is tied to app services and per-surface flow logic. We need package-level domain APIs so multiple send surfaces can share one core protocol and state machine.

## Goals / Non-Goals
- Goals:
  - Introduce `pkg/agency-data` as the canonical data-domain package.
  - Provide `promote-system` subpath export for delivery orchestration.
  - Keep `.agency` storage backward compatible.
  - Keep main-process facade thin and renderer integration stable.
- Non-Goals:
  - Moving session transport out of Electron main process.
  - Rewriting all surfaces in one step (Reply remains follow-up).

## Decisions
- Decision: Create root workspace and package at `pkg/agency-data`.
  - Rationale: Enables independent build, explicit boundaries, and future reuse.
- Decision: Keep `promote-system` as package subpath export.
  - Rationale: Aligns with “data management as parent package, promote as submodule.”
- Decision: Host adapter contract for dispatch.
  - Rationale: Data/protocol stays in package; session I/O remains host-owned.
- Decision: Compatibility-first storage policy.
  - Rationale: Avoid migration risk by preserving `.agency/hil` and `.agency/action-sheets` semantics.
- Decision: Add append-only delivery event log.
  - Rationale: Uniform audit timeline across sources/modes.

## Interfaces
```ts
export type DeliverySource = 'promote' | 'explorer';
export type DeliveryMode = 'quick' | 'gated';

export interface DeliveryRequest {
  worktreePath: string;
  source: DeliverySource;
  mode: DeliveryMode;
  description: string;
  sessionId: string;
  cellId?: string;
  selectedItems: Array<{
    id: string;
    kind: string;
    body: string;
    anchor?: { file?: string; line?: number; column?: number } | null;
    references?: Array<Record<string, unknown>>;
  }>;
  metadata?: Record<string, unknown>;
}

export interface DeliveryHostAdapter {
  dispatchToSession(input: {
    cellId?: string;
    sessionId: string;
    command: string;
    label?: string;
    appendEnter?: boolean;
    doubleEnter?: boolean;
  }): Promise<{ ackAt: string }>;
  focusSession?(input: { cellId?: string; sessionId: string }): Promise<void> | void;
  openTerminal?(): Promise<void> | void;
}
```

## Risks / Trade-offs
- Risk: Workspace introduction changes dependency/lock behavior.
  - Mitigation: Move to single root lock and keep app scripts unchanged at entry.
- Risk: Dual-write/dual-read confusion during transition.
  - Mitigation: Single canonical write path through package repositories; keep old fields mirrored only when needed.

## Migration Plan
1. Add workspace and package scaffold.
2. Implement repositories for HIL/action-sheets/delivery-events.
3. Port promote-system orchestration.
4. Wire Electron services to package APIs with thin facade.
5. Keep renderer API stable, then migrate to new delivery IPC calls.
6. Run compatibility regression on existing `.agency` fixtures.
