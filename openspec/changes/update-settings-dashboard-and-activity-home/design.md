## Context
The activity bar logo is a natural "home" affordance, but it is currently non-functional. The Settings view only exposes project selection, leaving configuration entry points scattered across the UI.

## Goals / Non-Goals
- Goals:
  - Provide a consistent home shortcut to Agent Cells.
  - Make Settings a lightweight dashboard that summarizes project context and links to configuration areas.
  - Keep configuration editing in Hierarchy to avoid duplicating forms.
- Non-Goals:
  - Do not relocate or redesign existing configuration forms.
  - Do not add new persistent settings storage in this change.

## Decisions
- Decision: Treat the activity bar logo as a home shortcut to Agent Cells.
  - Rationale: Matches common IDE patterns and reduces navigation friction.
- Decision: Settings remains an overview/index page.
  - Rationale: Centralizes entry points without duplicating configuration logic.

## Risks / Trade-offs
- The Settings view may feel lightweight if users expect full configuration. Mitigate by adding clear entry cards and status summaries.

## Migration Plan
- No data migration required.
- UI-only changes; existing settings storage and hierarchy navigation remain unchanged.

## Open Questions
- Whether to add additional status indicators (e.g., IPC health) beyond tmux/runtime info.
