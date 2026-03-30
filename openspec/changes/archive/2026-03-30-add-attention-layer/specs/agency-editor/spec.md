## ADDED Requirements

### Requirement: Canonical Attention Layer
The editor SHALL provide one shared attention layer over canonical objects instead of surface-local urgency indicators.
The attention layer SHALL attach only to canonical object ownership:
- `Window`
- `Cell`
- `Session`
- `Run`

#### Scenario: Attention does not invent a new object root
- **WHEN** a surface renders an item that requires user intervention
- **THEN** the item references a canonical `Window`, `Cell`, `Session`, or `Run`
- **AND** the product does not introduce a competing standalone attention object hierarchy

### Requirement: Attention State Vocabulary
The editor SHALL classify attention using a bounded shared vocabulary.
At minimum the vocabulary SHALL support:
- `running`
- `failed`
- `pending_confirmation`
- `unread`
- `return_required`

#### Scenario: Same state language across surfaces
- **WHEN** the same session or run requires attention in Session Map, Agent Cells, and shell chrome
- **THEN** each surface uses the same attention state label and severity semantics

### Requirement: Cross-Surface Attention Surfacing
The editor SHALL surface local attention consistently in Session Map, Agent Cells, and shell chrome.
The editor SHALL surface cross-window attention through the existing window-shell/window-switching path using a minimal window attention summary.

#### Scenario: Another window advertises urgency
- **WHEN** a non-focused Agency window has a higher-priority attention item than the current window
- **THEN** the current window can show that urgency through shell chrome
- **AND** the window switcher identifies the target window's primary attention state

### Requirement: Attention Jump Paths
Attention items SHALL support direct navigation to the owning object instead of passive display-only indicators.

#### Scenario: Jump from attention item to target object
- **WHEN** a user activates an attention item
- **THEN** the editor focuses the owning object using bounded existing navigation paths
- **AND** run/session attention uses Session Map or Agent Cells as appropriate
- **AND** window attention focuses the target window

### Requirement: Running Child Execution Stays Visible
The editor SHALL keep active bounded child execution visible in the attention layer until the run no longer requires intervention.

#### Scenario: Running child execution is not buried
- **WHEN** a `Create Agent` child-execution run is active
- **THEN** the attention layer surfaces that run in shell chrome and current-window surfaces
- **AND** the user can jump to its owning session/run context

### Requirement: Return-Required Session Attention
The editor SHALL surface when a run creates or readies a session that the user has not revisited yet.

#### Scenario: Child session requires follow-up
- **WHEN** a run creates a child session and the user has not revisited that session since the run completed
- **THEN** the attention layer marks that session as `return_required`
- **AND** activating the attention item focuses that session
