# Change: Converge promotion delivery storage and runtime paths

## Why
Current delivery behavior is split across multiple renderer-side code paths. Promote and Explorer still contain duplicated draft/status logic instead of fully using the delivery facade, and session quick-dialog sends are not persisted as unified delivery runs.

This makes promotion records fragmented and weakens traceability across sources.

## What Changes
- Fully route Promote and Explorer dispatch through the delivery API (`startDelivery` / `confirmDelivery` / `getDeliveryStatus` / `getDeliveryTimeline`) instead of ad-hoc renderer-side draft state mutation.
- Extend delivery source model to include session quick-dialog dispatch (`source=session`) while keeping mode semantics (`quick` default, optional `gated` where applicable).
- Converge promotion persistence so all delivery runs use the same storage contract:
  - Draft records in HIL draft storage.
  - Audit timeline in `.agency/delivery/events-<worktree>.jsonl`.
- Ensure each delivery record carries explicit session ownership metadata (session id, cell id, origin/target context when available).
- Keep backward compatibility for existing draft metadata and timeline rendering.
- Use explicit confirm-key dispatch for programmatic terminal submissions so delivery/action-sheet sends execute in target CLIs instead of only injecting raw newline bytes.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/app/useHilPromoteWorkflow.ts`
  - `apps/editor/renderer/src/app/useActionSheetOrchestration.ts`
  - `apps/editor/renderer/src/components/SessionReplyPanel.tsx`
  - `apps/editor/renderer/src/utils/deliveryMetadata.ts`
  - `apps/editor/electron/services/delivery.ts`
  - `pkg/agency-data/src/promote-system/index.ts`
- Risk:
  - Behavior drift in quick dispatch and session reply send semantics.
- Mitigation:
  - Preserve existing send payloads and explicitly control append-enter behavior per source while upgrading host dispatch from raw newline injection to explicit confirm keys.
