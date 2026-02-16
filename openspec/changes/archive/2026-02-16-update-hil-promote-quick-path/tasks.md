## 1. Implementation
- [x] 1.1 Keep `Quick` and `Gated` mode controls in Promote and map to shared delivery API.
- [x] 1.2 Migrate Promote dispatch to unified delivery start/confirm/status flow.
- [x] 1.3 Migrate Explorer footer send to unified delivery flow with `source=explorer`.
- [x] 1.4 Add optional advanced gated path for Explorer send.
- [x] 1.5 Unify payload envelope metadata fields (`source`, `mode`, `executionStatus`, timestamps, references).
- [x] 1.6 Keep quick-mode immediate-consume behavior after ACK for both sources.
- [x] 1.7 Update copy/labels to unified send semantics while preserving source badges.
- [x] 1.8 Add timeline entry points from Promote and Explorer summaries.

## 2. Validation
- [x] 2.1 Promote quick dispatch works in one primary action without creating Action Sheet.
- [x] 2.2 Explorer quick send dispatches through same delivery protocol as Promote.
- [x] 2.3 Gated mode still creates/binds Action Sheet and reflects gate status.
- [x] 2.4 Quick runs record source/mode-tagged audit events.
- [x] 2.5 Legacy drafts without new delivery fields still render correctly.
