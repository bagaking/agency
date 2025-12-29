## 1. Implementation
- [x] Add TerminalManager module with create/attach/detach/dispose/ensureStarted APIs
- [x] Refactor TerminalPane/TerminalArea to render persistent surfaces per session
- [x] Update session switching to toggle visibility and trigger fit/refresh on activation
- [x] Ensure terminated sessions are disposed and removed from manager
- [x] Add diagnostics logging for attach/detach/activation refresh failures

## 2. Tests
- [x] Update or add renderer tests to cover tab switching without blank terminal
- [x] Run `pnpm --filter agency-editor test:e2e`
