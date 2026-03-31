## MODIFIED Requirements
### Requirement: Cross-Surface Attention Surfacing
The editor SHALL surface local attention consistently in a shell-level attention rail, Session Map, Agent Cells, and shell chrome.
The editor SHALL assign bounded roles to those surfaces instead of letting each one become a generic attention dashboard.
- the shell-level attention rail SHALL be the current-window queue / triage surface for multiple local attention items and the host for Commander briefing.
- in Agent Cells, that same shell-level right-edge launcher rail SHALL expose the `Session Reply Relay` entry point instead of relying on a second dedicated drawer handle.
- Session Map `Ops` SHALL be the focused session/run evidence rail rather than the window-level queue surface.
- shell chrome SHALL expose compact attention summaries, including the status bar primary item and the window switcher cross-window summary.
- Agent Cells SHALL surface attention inline on owning Cell and Session affordances and SHALL NOT prepend a queue-style attention panel ahead of the primary Cell / Session management list.
The editor SHALL surface cross-window attention through the existing window-shell/window-switching path using a minimal window attention summary.

#### Scenario: Shell rail owns queue-style triage
- **WHEN** the current window has multiple local attention items
- **THEN** the shell-level attention rail exposes the current-window priority queue
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
- **AND** the status bar `Next` tooltip expands the canonical attention label into a short destination-aware sentence that matches the real jump behavior

#### Scenario: Reply shares the launcher rail but not the semantics
- **WHEN** the user is in Agent Cells and opens `Session Reply Relay`
- **THEN** the entry point can live on the shared shell right-edge launcher rail
- **AND** the Reply surface remains session-bound rather than becoming part of attention triage or Commander briefing semantics
