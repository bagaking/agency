## ADDED Requirements

### Requirement: Continue on Mobile Hub Mode
The editor SHALL provide a hub-oriented mobile continuation mode that attaches to a dedicated tmux Hub session instead of directly attaching to only one target session.

#### Scenario: Hub continuation command is generated
- **WHEN** a user triggers Continue on Mobile in Hub mode
- **THEN** the editor generates an SSH command that creates-or-attaches a deterministic Hub tmux session for the current project
- **AND** the command is suitable for direct execution in mobile SSH clients.

#### Scenario: Hub session exposes Project/Cell/Session navigator
- **WHEN** the generated Hub command is executed and the Hub session is attached
- **THEN** the Hub renders an interactive terminal navigator listing available sessions grouped by Project -> Cell -> Session
- **AND** the user can switch to a selected session without returning to desktop UI.

#### Scenario: Hub catalog reflects live lifecycle changes
- **WHEN** Agency sessions are created, renamed, detached, or closed
- **THEN** subsequent Hub refreshes update the navigator entries accordingly
- **AND** stale/non-live targets are not presented as attachable by default.

### Requirement: Continue on Mobile Action Variants
The editor SHALL expose both direct-session continuation and Hub continuation variants from session-level UI.

#### Scenario: Direct continuation remains available
- **WHEN** a user selects direct continuation from session UI
- **THEN** the editor preserves existing behavior that targets the selected session tmux identity
- **AND** continues to copy the generated direct command to clipboard when ready.

#### Scenario: Hub continuation reuses SSH readiness diagnostics
- **WHEN** a user selects Hub continuation and no listening SSH endpoint is available
- **THEN** the editor runs the same SSH readiness detection/enabling workflow used by direct continuation
- **AND** surfaces warning/manual-next-step diagnostics in Hub mode result payload.

### Requirement: Terminal Data Write Batching
The editor SHALL batch high-frequency terminal output writes at frame granularity before flushing to xterm.

#### Scenario: High-throughput output avoids per-chunk repaint storms
- **WHEN** terminal runtime receives many output chunks within the same animation frame
- **THEN** the renderer coalesces those chunks and performs a single xterm write flush for that frame
- **AND** activity detection semantics remain unchanged.
