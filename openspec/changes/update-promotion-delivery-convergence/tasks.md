## 1. Implementation
- [x] 1.1 Refactor Promote workflow to call unified delivery APIs for start/confirm/status instead of renderer-local draft execution mutations.
- [x] 1.2 Refactor Explorer quick/gated dispatch to the same delivery API path and keep summary/timeline behavior intact.
- [x] 1.3 Extend delivery source contract to include `session` and support session-owned metadata in delivery records.
- [x] 1.4 Wire Session Reply quick send to unified delivery run persistence while preserving current payload semantics.
- [x] 1.5 Ensure draft meta/audit entries include explicit session ownership fields (`executionSessionId`, `deliveryCellId`, origin/target hints when available).
- [x] 1.6 Keep backward-compatible handling for existing drafts without new source fields.

## 2. Validation
- [x] 2.1 `pnpm -C pkg/agency-data run typecheck`
- [x] 2.2 `pnpm -C apps/editor run typecheck:renderer`
- [x] 2.3 `pnpm -C apps/editor run typecheck:electron`
- [x] 2.4 Verify (scripted smoke): Promote quick dispatch creates unified draft+audit and immediate confirm consumption.
- [x] 2.5 Verify (scripted smoke): Explorer quick dispatch creates unified draft+audit with `source=explorer`.
- [x] 2.6 Verify (scripted smoke): Session Reply send creates unified delivery records with session ownership metadata.
