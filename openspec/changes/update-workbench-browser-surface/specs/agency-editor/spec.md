## ADDED Requirements

### Requirement: Workbench Browser Surface Integrity
The Workbench SHALL treat the bounded web research tab as the product's canonical browser surface for URL-driven workflows while keeping the bounded product limits intact (no cookie/session management, general tab chrome, or multi-URL navigation outside the tab model). The tab SHALL render remote `http`/`https` content, expose available `Live`/`Reader` view modes, and surface page-level actions such as `Reload`, `Open in Browser`, `Save Markdown`, and `Cite`. Escaping to the full system browser SHALL remain the way to leave the bounded surface, and private or localhost URLs SHALL continue to be rejected.

#### Scenario: The browser surface shows live content and its actions
- **WHEN** a bounded web research tab is active in Workbench
- **THEN** the tab renders the remote page content, toggles between available `Live` and `Reader` views, and exposes the page-level actions (`Reload`, `Open in Browser`, `Save Markdown`, `Cite`) within the same tab so the surface feels like the true browser surface for that URL
- **AND** those actions do not bounce the user back to Explorer because the Workbench tab owns the incumbent research workflow

#### Scenario: Bounded product limits stay enforced on the browser surface
- **WHEN** the Workbench browser surface renders a URL
- **THEN** private/localhost URLs are rejected, Workbench does not start managing cookies or multi-tab browser state, and the user must explicitly hit `Open in Browser` when full browsing is required
- **AND** saved Markdown artifacts continue to route through the existing save/cite flows (fixed `agency_source_*` frontmatter plus memo references) so no supplemental persistence or agent-visible artifacts are introduced
