## MODIFIED Requirements

### Requirement: Embedded Terminal and CLI Management
The editor SHALL keep one terminal renderer instance per session and reuse it across tab switches.
The editor SHALL render inactive terminals in a hidden state that preserves layout dimensions.
The editor SHALL re-run a terminal refresh and fit when a session becomes active.

#### Scenario: Switch session without blank terminal
- **WHEN** a user switches between terminal sessions rapidly
- **THEN** the terminal remains visible without requiring manual resize or zoom

### Requirement: Per-Cell Multi-Session Terminals
The editor SHALL retain terminal renderer instances for all open sessions until those sessions are terminated.

#### Scenario: Persistent terminal instances
- **WHEN** a user switches away from a session and back
- **THEN** the same terminal renderer instance resumes without reinitialization

### Requirement: Stable Initial Sizing
The editor SHALL perform an activation refresh pass after tab switches to stabilize rendering.

#### Scenario: Activation refresh
- **WHEN** a session becomes active after being hidden
- **THEN** the editor performs a fit/refresh pass to avoid empty renders
