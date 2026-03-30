## MODIFIED Requirements
### Requirement: Cross-Surface Attention Surfacing
The editor SHALL surface local attention consistently in Session Map, Agent Cells, and shell chrome.
The editor SHALL assign bounded roles to those surfaces instead of letting each one become a generic attention dashboard.
- Session Map `Ops` SHALL be the current-window queue / triage surface for multiple local attention items.
- shell chrome SHALL expose compact attention summaries, including the status bar primary item and the window switcher cross-window summary.
- Agent Cells SHALL surface attention inline on owning Cell and Session affordances and SHALL NOT prepend a queue-style attention panel ahead of the primary Cell / Session management list.
The editor SHALL surface cross-window attention through the existing window-shell/window-switching path using a minimal window attention summary.

#### Scenario: Session Map owns queue-style triage
- **WHEN** the current window has multiple local attention items
- **THEN** Session Map `Ops` exposes the current-window priority queue
- **AND** activating a queue item jumps to the owning object

#### Scenario: Agent Cells keeps Cell management primary
- **WHEN** the user opens Agent Cells while attention items exist
- **THEN** attention appears inline on owning Cell and Session affordances
- **AND** the Cell / Session management list remains the leading content of the sidebar
- **AND** the view does not insert a queue card ahead of that list

#### Scenario: Shell chrome stays compact
- **WHEN** attention needs to remain visible outside Session Map
- **THEN** shell chrome exposes compact summaries rather than a second queue dashboard
- **AND** the status bar can jump to the highest-priority current-window item
