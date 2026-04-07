## MODIFIED Requirements
### Requirement: Workbench Browser-Surface View
The Workbench SHALL host bounded web research `View` as a true browser surface rather than a renderer iframe.
The browser surface SHALL stay owned by the active bounded web research tab and SHALL keep the same bounded public-URL policy as Explorer intake.
Workbench layout SHALL own the browser-lane geometry through one authoritative Workbench viewport host plus an explicit renderer-view seam rather than relying on a nested tab-local DOM host relay, shell proxy host, or raw renderer-bounds fallback.

#### Scenario: Browser lane geometry comes from one Workbench viewport host
- **WHEN** a bounded web research tab enters `View`
- **THEN** Workbench layout exposes one authoritative browser viewport host for the live lane
- **AND** the native browser surface uses that viewport host geometry rather than any nested tab-local browser fragment or shell relay host as its final placement source
- **AND** moving the measuring node to another nested browser-related DOM container does not satisfy this requirement

#### Scenario: Browser lane reacts to shell siblings through one geometry contract
- **WHEN** sidebar width, attention rail, HIL drawer, or Workbench sibling panes change layout
- **THEN** the authoritative Workbench viewport host rect updates
- **AND** the native browser surface resynchronizes from that viewport host instead of relying on incidental descendant resize effects

#### Scenario: Occluded shell states fail closed
- **WHEN** the lane is suspended, hidden, or its renderer-view seam cannot be resolved
- **THEN** the native browser surface hides or suspends through one explicit host state transition
- **AND** Agency does not preserve stale browser placement or trust raw renderer coordinates
