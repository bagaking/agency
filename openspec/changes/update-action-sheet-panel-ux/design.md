# Design: Action Sheet Panel UX

## Context
Action Sheets now exist as a core execution unit, but visibility and integration are fragmented. The panel should be discoverable (activity bar) and reusable (embed in Promote).

## Goals / Non-Goals
- Goals:
  - Provide a dedicated Activity Bar entry under Agent Cells.
  - Standardize Action Sheet panel layout (left list + right detail).
  - Offer an embeddable Action Sheet status panel for Promote and other flows.
- Non-Goals:
  - Replace the Action Sheet runner or its data model.
  - Rebuild the full Promote UI.

## Decisions
- Activity bar placement: Agent Cells → Action Sheets → Explorer → Memo → Hierarchy → Settings.
- Panel layout uses shared docked sidebar conventions.
- Embeddable panel uses the same data source but renders a compact status list + session jump.

## Risks / Trade-offs
- Activity bar reordering impacts muscle memory; provide labels/tooltips.
- Embedding panel in Promote must avoid duplicating runner state.

## Migration Plan
- Refactor ActionSheetsView into container + panel components.
- Add new Activity Bar item and route to Action Sheets view.
- Reuse panel in Promote with a compact variant.
