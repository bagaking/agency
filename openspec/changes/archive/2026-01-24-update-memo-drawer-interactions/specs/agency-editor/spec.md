## ADDED Requirements

### Requirement: Memo Drawer Shortcut Interaction
Memo drawer shortcut cards SHALL support Flash, Excerpt, and Screenshot capture surfaces.
Memo drawer shortcut cards SHALL allow inline capture interaction without switching the main Memo panel by default.
The drawer SHALL provide an explicit "View Records" action on each shortcut card to switch the main Memo inbox section.
When a memo capture is confirmed and stored, the main Memo panel SHALL switch to the corresponding inbox section.
These behaviors SHALL follow the interaction rules described in `apps/editor/README.md#memo-drawer-interactions`.

#### Scenario: Interact with shortcut without switching
- **WHEN** a user interacts with a shortcut card input in the Memo drawer
- **THEN** the main Memo panel remains on its current view

#### Scenario: Switch via View Records
- **WHEN** a user clicks the shortcut card "View Records" action
- **THEN** the main Memo panel switches to that inbox section

#### Scenario: Switch after capture
- **WHEN** a user saves a memo capture from the drawer
- **THEN** the main Memo panel switches to the matching inbox section
