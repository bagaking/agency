# Change: Refactor HIL and session-reply artifact boundaries

## Why
The current implementation stores session reply records inside the HIL repository and Memo inbox. That collapses two different artifact owners into one storage root, conflicts with the canonical artifact model, and makes HIL behave like a generic artifact bucket instead of a bounded human-in-loop system.

## What Changes
- Keep HIL storage strictly scoped to `comment`, `memo`, and `draft` artifacts.
- Introduce a dedicated session-reply artifact store with explicit `cellId` and `sessionId` ownership.
- Keep delivery drafts in HIL, but let `source=session` deliveries reference reply artifacts instead of pretending replies are HIL items.
- Remove reply records from Memo/HIL inbox surfaces and keep reply history on the Session Reply surface.
- Tighten repository contracts so artifact kinds, ownership, and storage paths are explicit instead of open-ended `meta` conventions.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `pkg/agency-data/src/repositories/hilRepository.ts`
  - `pkg/agency-data/src/repositories/sessionReplyRepository.ts`
  - `pkg/agency-data/src/promote-system/index.ts`
  - `apps/editor/electron/services/hil.ts`
  - `apps/editor/electron/services/sessionReplies.ts`
  - `apps/editor/electron/ipc/handlers/hil.ts`
  - `apps/editor/electron/ipc/handlers/sessionReplies.ts`
  - `apps/editor/electron/preload.ts`
  - `apps/editor/renderer/src/services/agencyBridge.ts`
  - `apps/editor/renderer/src/components/sessionReply/*`
  - `apps/editor/renderer/src/app/useSessionReplyContext.ts`
  - `apps/editor/renderer/src/hooks/useHilMemoState.ts`
  - `apps/editor/renderer/src/components/hil/memo/*`
- Risk:
  - Regressing delivery/session-reply history behavior while untangling storage.
- Mitigation:
  - Land the contract first, keep delivery draft storage unchanged, and add focused unit coverage for repository and UI integration seams.
