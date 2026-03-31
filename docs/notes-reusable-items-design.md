---
title: Reusable Items - Design (Catalog)
required: false
sop:
  - Update this list when you introduce a new token/palette/component pattern or a new design artifact workflow.
  - Keep links to the source of truth (design files, token definitions, component library docs).
  - Regenerate `docs/must-sop.md` after SOP/frontmatter changes.
---

# Reusable Items - Design (Catalog)

This is a project-local catalog of reusable design assets (source of truth + usage guidance).

## Component Library (UI Primitives)
| Item | Must/Nice | When to Use | Source of Truth |
| --- | --- | --- | --- |
| Tooltip | MUST | Non-interactive hint overlays; viewport-aware positioning. | `apps/editor/renderer/src/components/ui/Tooltip.jsx` |
| IconButton | MUST | Icon-only actions with tooltip + accessibility label. | `apps/editor/renderer/src/components/ui/IconButton.jsx` |
| Focus ring utilities | MUST | Focus-visible styles; avoid inline focus chains. | `apps/editor/renderer/src/components/ui/focusRing.js` |
| AgentAvatar | MUST | Avatar rendering + offline styling. | `apps/editor/renderer/src/components/ui/AgentAvatar.jsx` |
| PreviewLoading | MUST | Full-size SVG loading overlay for preview surfaces (hover previews, terminal loaders). | `apps/editor/renderer/src/components/ui/PreviewLoading.jsx` |

## Overlays & Hover Mechanisms
| Item | Must/Nice | When to Use | Source of Truth |
| --- | --- | --- | --- |
| Explorer context menu | MUST | Action lists; must support ESC/outside click close + anti-collision. | `apps/editor/renderer/src/components/explorer/ExplorerContextMenu.jsx` |
| Session menus | MUST | Session action menus; reuse menu layout. | `apps/editor/renderer/src/components/SessionMenus.jsx` |
| Session hover preview card | MUST | Interactive hover preview with scrollable terminal snapshot. | `apps/editor/renderer/src/components/sessionMap/SessionMapHoverCard.jsx` |
| Workbench inline overlay | NICE-TO-HAVE | Code view hover actions; prefer extending existing behavior. | `apps/editor/renderer/src/components/workbench/CodeWorkbenchView.jsx` |

Usage rules:
- Tooltip → non-interactive hints only.
- Hover card → interactive preview or rich info (scrollable if content overflows).
- Context menu → action lists; must support ESC/outside click close and anti-collision.
- Do not introduce new overlay/portal logic without first checking the items above. If a new mechanism is truly required, it MUST be added to this catalog in the same change.

## Design Artifacts
| Item | Must/Nice | When to Use | Source of Truth |
| --- | --- | --- | --- |
| UI component reuse rules | MUST | Any UI component work. | `docs/guidelines-ui-components.md` |
| Project Home no-project composition | MUST | Any no-project startup, recent-project recovery, or home-shell affordance work should reuse the shared Project Home composition instead of splitting Explorer-empty and Agent-Cells-empty into separate visual languages. | `apps/editor/renderer/src/components/projectHome/ProjectHomeSidebar.tsx`, `apps/editor/renderer/src/components/projectHome/ProjectHomeView.tsx`, `apps/editor/README.md` |
| Session map layout + hover behavior | MUST | Session map or hover preview changes. | `docs/notes-session-management.md` |
| Attention surface hierarchy | MUST | Any attention / urgency UX change; keep queue-style triage in Session Map `Ops`, compact summaries in shell chrome, and inline/local indicators in Agent Cells. | `docs/notes-session-management.md`, `apps/editor/README.md` |
| Terminal keyboard behavior | MUST | Terminal input/shortcut changes. | `docs/notes-terminal-keyboard.md` |
| Memo/HIL surface language | SHOULD | Any Memo, Comments, Drafts, Capture, or Promote UI work should reuse the shared Memo-first terminology and chrome rules rather than inventing per-panel labels. | `docs/guidelines-hil-surface-design.md`, `apps/editor/renderer/src/components/hil/hilSurfaceSystem.tsx` |

## Deprecations
- None currently.
