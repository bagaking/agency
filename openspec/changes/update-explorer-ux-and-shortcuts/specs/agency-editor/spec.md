## ADDED Requirements

### Requirement: Explorer Editing Shortcuts
The editor SHALL support common file editing shortcuts for workbench tabs, including save, save-as, close tab, and find/replace.
Shortcuts SHALL respect platform conventions (Cmd on macOS, Ctrl on Windows/Linux).

#### Scenario: Save via keyboard
- **WHEN** a user presses Cmd/Ctrl+S in an open file
- **THEN** the editor saves the file without requiring a UI button click

#### Scenario: Close tab via keyboard
- **WHEN** a user presses Cmd/Ctrl+W in an open file
- **THEN** the editor closes the active tab

#### Scenario: Find via keyboard
- **WHEN** a user presses Cmd/Ctrl+F in an open file
- **THEN** the editor opens the find UI for that file

### Requirement: Explorer Action Tooltips
Icon-only Explorer controls SHALL display a tooltip with an action description on hover.
Tooltip styling SHALL match the app’s muted/foreground palette.

#### Scenario: Hover tooltip
- **WHEN** a user hovers an icon-only Explorer control
- **THEN** a tooltip appears with the control’s purpose

### Requirement: Explorer Palette Consistency
Explorer header and footer sections SHALL use the same muted/foreground palette as other primary panels.

#### Scenario: Explorer palette aligned
- **WHEN** the Explorer view is visible
- **THEN** its header/footer colors match the app’s standard panel palette

### Requirement: Comment Indicator Navigation
Files with HIL comments SHALL show a comment icon in the Explorer row.
Clicking the icon SHALL open the HIL drawer focused on comments for that file.

#### Scenario: Jump to comments from Explorer
- **WHEN** a file row shows a comment icon and the user clicks it
- **THEN** the HIL drawer opens and filters to comments for that file
