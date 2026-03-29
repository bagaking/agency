# Change: Refactor Commander Into One Unified Station

## Why
Commander is currently spread across multiple active OpenSpec changes and multiple renderer surfaces:
- Session Map `Command Ops`
- Session Map `Briefing` / Commander station panel
- Agent Cells Commander-backed session actions such as smart fork and smart name
- Commander-owned task sheets

Those slices were reasonable to land incrementally, but they now drift in both product language and implementation shape:
- one change still describes Commander as a popup while a newer one describes a right-edge panel;
- some Commander behavior is local evidence interpretation while other behavior is truly Harness/provider-backed, yet both are presented under one label;
- visual identity, status derivation, and ownership cues are duplicated across several components instead of flowing from one Commander model.

Agency now needs one canonical Commander plan that treats the UI station and the Harness-backed operator model as one bounded product capability without collapsing renderer/main/Harness boundaries into a monolith.
Commander in this change is a bounded surface/capability over session and run context, not a peer object alongside Cell, Session, or Run.

## What Changes
- Define Commander as one bounded operator station backed by the Main Agent Harness.
- Consolidate existing Commander planning into one canonical change and supersede:
  - `add-session-map-commander-dialog`
  - `update-session-map-commander-drawer`
  - `add-commander-smart-session-actions`
- Define one shared Commander model for:
  - current context and evidence
  - readiness for Commander-backed actions
  - action ownership and capability routing
  - status and copy semantics
- Unify the visual system across Commander surfaces so Session Map Ops, Briefing, Commander entry, Commander-owned menu actions, and Commander task sheets read as one product family.
- Keep two execution modes explicit inside the same Commander concept:
  - evidence-backed local briefing for deterministic explanation from current session/run/error state
  - provider-backed Commander actions that route through Harness and approved host-managed capabilities
- Keep Commander distinct from Session Reply, HIL drawers, and any future window-global assistant.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/sessionMap/*`
  - `apps/editor/renderer/src/components/agentCells/AgentCellsSessionsPanel.tsx`
  - `apps/editor/renderer/src/components/SessionMenus.tsx`
  - `apps/editor/renderer/src/components/commander/*`
  - `apps/editor/renderer/src/hooks/useCommanderStatus.ts`
  - `apps/editor/renderer/src/utils/sessionMapCommander.ts`
  - `apps/editor/electron/services/commanderStatus.ts`
  - Main Agent Harness action surfaces and Commander-facing facades
  - Commander-related docs and reusable-item references
- Risks:
  - over-consolidation could blur the line between local UI interpretation and real Harness/provider execution
  - a unified visual system could accidentally converge toward the wrong shell pattern such as HIL/Reply drawers
  - leaving legacy Commander changes active without cleanup will continue to create spec drift
- Mitigation:
  - keep one product concept but separate shared/electron/renderer layers
  - make execution mode explicit in the Commander model
  - mark older Commander changes as superseded instead of letting them remain parallel sources of truth
