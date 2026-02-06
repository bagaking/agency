## MODIFIED Requirements

### Requirement: Shortcut Interception Defaults
The editor SHALL NOT intercept keyboard shortcuts unless explicitly configured in Terminus settings for the active profile, except for documented baseline terminal compatibility behaviors that preserve cross-platform modifier keys.

#### Scenario: Baseline modifier behaviors
- **WHEN** a user presses Shift+Enter in the terminal and no Terminus bindings are configured for the active profile
- **THEN** the terminal receives the baseline Shift+Enter behavior documented for the editor's terminal compatibility layer.

### Requirement: Terminal Mouse + Selection Compatibility
The editor SHALL provide terminal mouse interaction, modifier key combos, and text selection simultaneously, without requiring global tradeoffs.

#### Scenario: Mouse interaction by default
- **WHEN** a user clicks or scrolls in a terminal with a TUI that enables mouse reporting
- **THEN** mouse interactions are delivered to the TUI by default.

#### Scenario: Force selection with modifier
- **WHEN** a user holds the selection modifier (Shift or Alt) and drags to select text
- **THEN** mouse reporting is temporarily disabled for that session and text selection succeeds in the terminal.

#### Scenario: Restore mouse after selection
- **WHEN** the selection drag ends or selection is cleared
- **THEN** mouse reporting returns to its default enabled state for that session.

## ADDED Requirements

### Requirement: Modifier-Based Scrollback Override
The editor SHALL allow users to force local scrollback even when mouse reporting is enabled.

#### Scenario: Alt/Option scrolls local buffer
- **WHEN** a user holds Alt/Option and scrolls the mouse wheel
- **THEN** the terminal scrollback moves locally without sending wheel events to the TUI.
