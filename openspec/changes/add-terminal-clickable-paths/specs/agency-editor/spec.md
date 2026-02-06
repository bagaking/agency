## ADDED Requirements

### Requirement: Cmd+Click path navigation
The editor SHALL allow users to Cmd+Click file paths in terminal output to open the file.
The editor SHALL support absolute and worktree-relative paths with optional `:line[:column]` suffixes.
The editor SHALL ignore trailing punctuation characters when resolving the path.

#### Scenario: Open file with line number
- **WHEN** a terminal line contains `docs/notes-terminal-keyboard.md:11`
- **AND** the user Cmd+Clicks the path
- **THEN** the editor opens `docs/notes-terminal-keyboard.md` at line 11

#### Scenario: Ignore punctuation
- **WHEN** a terminal line contains `行为说明。docs/notes-terminal-keyboard.md:11` 
- **THEN** the resolved path is `docs/notes-terminal-keyboard.md` (excluding `行为说明。`)

### Requirement: Session Reply Relay
The editor SHALL provide a session-side Reply panel for creating reply memos.
The editor SHALL store replies as memo kind `reply` and isolate reply threads per session.
The editor SHALL NOT allow editing reply memos inside the main Memo view.

#### Scenario: Reply panel default
- **WHEN** a user opens a session
- **THEN** the right-side panel defaults to Reply

### Requirement: Reply editor and actions
The editor SHALL provide a rich markdown editor for reply input.
The editor SHALL support `Record`, `Send to Current`, and `Send to Other` actions.

#### Scenario: Record reply
- **WHEN** a user submits a reply with `Record`
- **THEN** the reply is saved as a memo without sending terminal input

#### Scenario: Send reply to current session
- **WHEN** a user submits a reply with `Send to Current`
- **THEN** the reply is saved as a memo and sent to the active session

### Requirement: Reply metadata
The editor SHALL record source site and query for replies in metadata.
The editor SHALL record selection time (or a fixed tag when no selection) instead of line numbers.
The editor SHALL record the authoring cell/session and timestamp.

#### Scenario: Reply metadata recorded
- **WHEN** a reply is created
- **THEN** its memo metadata includes source, selection time tag, and session identifiers

### Requirement: Send-result cards
The editor SHALL display send-result cards in the Reply panel.
Each card SHALL show the target avatar and provide a jump link to the destination.
Record-only cards SHALL show a memo icon and jump link to the stored memo.

#### Scenario: Send-result card
- **WHEN** a reply is sent to another session
- **THEN** a card shows the target avatar and a navigation link
