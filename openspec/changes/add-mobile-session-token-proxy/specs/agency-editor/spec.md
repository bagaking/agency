## ADDED Requirements

### Requirement: Continue on Mobile Proxy Mode
The editor SHALL provide a token-authenticated proxy continuation mode that allows a mobile client to attach to a target tmux session without requiring direct tmux target knowledge.

#### Scenario: Proxy continuation command is generated
- **WHEN** a user triggers Continue on Mobile in proxy mode for a live session
- **THEN** the editor generates a proxy connect command containing endpoint and session token
- **AND** the command is suitable for direct execution in mobile terminal clients.

#### Scenario: Session token remains reusable during session lifetime
- **WHEN** a user repeatedly triggers proxy continuation for the same live session
- **THEN** the editor reuses the same session token
- **AND** token validity remains until that session ends.

#### Scenario: Session token is rejected after session ends
- **WHEN** a client attempts proxy attach with a token whose target session has ended
- **THEN** the proxy rejects the attach request
- **AND** the editor does not treat that token as valid for future attaches.

## MODIFIED Requirements

### Requirement: Continue on Mobile Action Variants
The editor SHALL expose direct-session continuation, Hub continuation, and proxy-token continuation variants from session-level UI.

#### Scenario: Direct continuation remains available
- **WHEN** a user selects direct continuation from session UI
- **THEN** the editor preserves existing behavior that targets the selected session tmux identity
- **AND** continues to copy the generated direct command to clipboard when ready.

#### Scenario: Hub continuation reuses SSH readiness diagnostics
- **WHEN** a user selects Hub continuation and no listening SSH endpoint is available
- **THEN** the editor runs the same SSH readiness detection/enabling workflow used by direct continuation
- **AND** surfaces warning/manual-next-step diagnostics in Hub mode result payload.

#### Scenario: Proxy continuation is available from session UI
- **WHEN** a user selects proxy continuation from session UI
- **THEN** the editor prepares a proxy-mode command payload for the selected session
- **AND** the UI surfaces proxy endpoint/token diagnostics when setup is incomplete.
