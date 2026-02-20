## ADDED Requirements
### Requirement: Session Continue on Mobile
The editor SHALL provide a session-level "Continue on Mobile" action that prepares a remote attach command for the selected session.
The command MUST target the session's bound tmux session and be suitable for direct execution in mobile SSH clients.

#### Scenario: Ready command copied
- **WHEN** a user triggers "Continue on Mobile" for a live session and SSH endpoint discovery succeeds
- **THEN** the editor generates an `ssh ... -t "tmux attach-session -t <session>"` command for that session
- **AND** copies the command to clipboard
- **AND** surfaces readiness details (host/port/session)

#### Scenario: SSH endpoint not ready
- **WHEN** a user triggers "Continue on Mobile" and no listening SSH endpoint is detected
- **THEN** the editor attempts a best-effort local SSH service enable flow
- **AND** re-runs port discovery
- **AND** if still unavailable, surfaces a manual next-step command with clear warning state

#### Scenario: Stale or missing session
- **WHEN** a user triggers "Continue on Mobile" for a missing/stale session
- **THEN** the editor rejects command generation and shows an actionable error
- **AND** does not report command-copy success
