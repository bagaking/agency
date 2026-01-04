## 1. Proposal
- [x] 1.1 Confirm Action Sheet naming, storage path, and prompt tags.
- [x] 1.2 Validate conditional plugin behavior and retry limits.

## 2. Implementation
- [x] 2.1 Add Action Sheet data model and persistence under `.agency/action-sheets/`.
- [x] 2.2 Implement Action Sheet runner (state machine + session dispatch).
- [x] 2.3 Implement conditional plugin (when/then/else + repeat-until).
- [x] 2.4 Add UI panel to show status, gates, and linked session with collapse support.
- [x] 2.5 Add runtime logging for Action Sheet execution.
- [x] 2.6 Surface promote execution status in draft detail view.

## 3. Validation
- [x] 3.1 Update specs and validate with `openspec validate --strict`.
