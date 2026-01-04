## 1. Implementation
- [ ] 1.1 Add a voice capture hook/module that wraps Web Speech API and exposes recording state + transcript events.
- [ ] 1.2 Add a voice capture control component for Flash capture UI (start/stop, status, error).
- [ ] 1.3 Wire the control into Memo Flash capture in both drawer shortcuts and Inbox.
- [ ] 1.4 Add runtime logging for voice capture failures.

## 2. Validation
- [ ] 2.1 Manual: start/stop voice capture and verify transcript appends to Flash text.
- [ ] 2.2 Manual: confirm fallback state when Web Speech API is unavailable.
