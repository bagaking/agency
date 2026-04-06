## MODIFIED Requirements
### Requirement: Workbench Browser-Surface View
The Workbench SHALL host bounded web research `View` as a true browser surface rather than a renderer iframe.
The browser surface SHALL stay owned by the active bounded web research tab and SHALL keep the same bounded public-URL policy as Explorer intake.
Workbench shell layout SHALL own the browser-lane geometry and occlusion state rather than relying on a nested tab-local DOM host to act as the authoritative native-pane placement source.

#### Scenario: Browser lane geometry comes from the shell
- **WHEN** a bounded web research tab enters `View`
- **THEN** Workbench shell layout produces the authoritative browser-lane rectangle
- **AND** the native browser surface uses that shell-owned rectangle rather than a nested tab-local DOM host measurement as its final placement source

#### Scenario: Browser lane reacts to shell siblings through one geometry contract
- **WHEN** sidebar width, attention rail, HIL drawer, or Workbench sibling panes change layout
- **THEN** the shell-owned browser-lane rectangle updates
- **AND** the native browser surface resynchronizes from that shell rectangle instead of relying on incidental descendant resize effects

#### Scenario: Occluded shell states fail closed
- **WHEN** the shell declares the browser lane suspended, hidden, or temporarily occluded by another surface
- **THEN** the native browser surface hides or suspends through one explicit host state transition
- **AND** Agency does not preserve stale browser placement under modals, drawers, or other shell overlays
