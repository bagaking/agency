## MODIFIED Requirements
### Requirement: Explorer Bounded URL Intake
The explorer SHALL provide bounded URL intake for URL-driven file workflows.
Explorer SHALL own discovery, intent selection, and launch/focus into a bounded web research workflow hosted by Workbench.
The feature SHALL NOT behave as a general-purpose browser replacement.

#### Scenario: Launch URL research into Workbench
- **WHEN** a user enters or confirms a public `http/https` URL from Explorer
- **THEN** the editor launches or focuses a bounded web research tab in Workbench
- **AND** Explorer remains the intake surface rather than replacing its primary panel with a browser-like page

### Requirement: Workbench Browser-Surface View
The Workbench SHALL host `View` for bounded web research as a true browser surface rather than a renderer iframe.
The browser surface SHALL remain owned by the focused bounded web research tab and SHALL preserve bounded product limits.

#### Scenario: Browser-denied sites still open in View
- **WHEN** a bounded web research tab enters `View`
- **THEN** Agency hosts the page in a browser surface that is not subject to iframe embedding limits
- **AND** sites that deny framing are handled by the browser host instead of renderer iframe failure

#### Scenario: View remains bounded to the active research tab
- **WHEN** the user switches tabs, windows, or leaves `View`
- **THEN** the browser surface follows the active bounded research tab lifecycle instead of becoming a window-global browser root

#### Scenario: In-view navigation updates the same research object
- **WHEN** the page navigates to another public `http/https` URL inside `View`
- **THEN** the bounded browser surface stays attached to the same Workbench research tab
- **AND** the tab URL/title update so `Reader`, `Save Markdown`, and `Cite` refer to the new page rather than stale metadata

#### Scenario: In-view navigation rejects non-public destinations
- **WHEN** the page tries to navigate to a localhost, private-network, or non-`http/https` destination
- **THEN** Agency rejects that navigation inside the browser surface
- **AND** the failure stays local to the bounded research tab instead of promoting Agency into a general browser

#### Scenario: Reader and bounded actions remain available
- **WHEN** a bounded web research tab is active
- **THEN** `Reader`, `Save Markdown`, `Cite`, and `Open in Browser` remain part of the same bounded research object flow
- **AND** the browser surface does not add browser-global tabs, cookie management UI, download management, or arbitrary browsing chrome
