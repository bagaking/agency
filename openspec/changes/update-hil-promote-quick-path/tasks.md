## 1. Implementation
- [ ] 1.1 Keep `Quick` and `Gated` mode controls in Promote and map to shared delivery API.
- [ ] 1.2 Migrate Promote dispatch to unified delivery start/confirm/status flow.
- [ ] 1.3 Migrate Explorer footer send to unified delivery flow with `source=explorer`.
- [ ] 1.4 Add optional advanced gated path for Explorer send.
- [ ] 1.5 Unify payload envelope metadata fields (`source`, `mode`, `executionStatus`, timestamps, references).
- [ ] 1.6 Keep quick-mode immediate-consume behavior after ACK for both sources.
- [ ] 1.7 Update copy/labels to unified send semantics while preserving source badges.
- [ ] 1.8 Add timeline entry points from Promote and Explorer summaries.

## 2. Validation
- [ ] 2.1 Promote quick dispatch works in one primary action without creating Action Sheet.
- [ ] 2.2 Explorer quick send dispatches through same delivery protocol as Promote.
- [ ] 2.3 Gated mode still creates/binds Action Sheet and reflects gate status.
- [ ] 2.4 Quick runs record source/mode-tagged audit events.
- [ ] 2.5 Legacy drafts without new delivery fields still render correctly.
