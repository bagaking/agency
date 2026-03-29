> Superseded by `refactor-commander-unified-station`.
>
> Keep this delta only as historical context. The canonical Commander delta now lives under the unified Commander station change.
>
> The detailed body below intentionally preserves obsolete popup/drawer wording and MUST NOT be treated as an active delta.

## ADDED Requirements

### Requirement: Session Map Commander Right-Edge Entry
The editor SHALL place the Commander identity at the far-right edge of the docked Session Map operational station.

#### Scenario: Commander entry appears as the right-edge backend anchor
- **WHEN** the docked Session Map is visible
- **THEN** the Commander identity is rendered at the far-right edge of the right-side operational cluster
- **AND** the entry reads as the primary backend/operator access point for that station

### Requirement: Session Map Commander Drawer Presentation
The editor SHALL present Commander as a Session Map-scoped right-edge drawer rather than a floating popup.

#### Scenario: Open commander as right-edge drawer
- **WHEN** a user opens Commander from docked Session Map
- **THEN** the editor reveals a full-height drawer aligned to the right edge of the Session Map surface
- **AND** the drawer remains visually attached to the Session Map operational station

#### Scenario: Close commander drawer without losing ops continuity
- **WHEN** a user dismisses the Commander drawer
- **THEN** the drawer closes while leaving the underlying `Command Ops` context intact
- **AND** the user does not lose the current session/run evidence state

### Requirement: Commander Drawer Stays Session Map-Scoped
The Commander drawer SHALL remain scoped to Session Map and SHALL NOT behave as a window-global assistant drawer in this change.

#### Scenario: Commander drawer closes with Session Map
- **WHEN** Session Map is closed
- **THEN** the Commander drawer is not shown elsewhere in the window
- **AND** the editor does not remount it as a shell-level right-side drawer
