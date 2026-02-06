---
title: Reusable Items - Coding (Catalog)
required: false
sop:
  - Update this list when you introduce or adopt a new reusable component/library/mechanism.
  - When you remove or deprecate something, update this list and point to the replacement or migration.
  - Regenerate `docs/must-sop.md` after SOP/frontmatter changes.
---

# Reusable Items - Coding (Catalog)

This is a project-local catalog of reusable engineering assets. The goal is discoverability and convergence.

## Reusable Components
| Item | Must/Nice | When to Use | Source of Truth |
| --- | --- | --- | --- |
| `SessionMenus` | MUST | Session-related action menus; avoid one-off menu markup. | `apps/editor/renderer/src/components/SessionMenus.jsx` |
| `AvatarPickerMenu` | MUST | Avatar selection UI with recents/active handling. | `apps/editor/renderer/src/components/ui/AvatarPickerMenu.jsx` |
| `AgentAvatarBadge` | MUST | Avatar rendering with idle/closed rings; use for all avatar displays. | `apps/editor/renderer/src/components/ui/AgentAvatarBadge.jsx` |

## Reusable Libraries / Packages
| Item | Must/Nice | When to Use | Source of Truth |
| --- | --- | --- | --- |
| `@xterm/xterm` | MUST | Terminal rendering; avoid mixing other terminal widgets. | `apps/editor/renderer/src/components/TerminalPane.jsx` |
| `lucide-react` | MUST | Icon set for UI consistency; avoid other icon packs. | `apps/editor/renderer/src/components` |
| `@bagakit/open-agent-avatars` | MUST | Avatar asset source; no external fallbacks. | `apps/editor/renderer/src/utils/agentAvatar.js` |

## Reusable Mechanisms
| Item | Must/Nice | When to Use | Source of Truth |
| --- | --- | --- | --- |
| Renderer IPC via `agencyBridge` | MUST | All renderer → main IPC calls. | `apps/editor/renderer/src/services/agencyBridge.js` |
| Session map model builder | MUST | Session map clustering/statistics. | `apps/editor/renderer/src/utils/sessionMapModel.js` |
| Time formatting helpers | MUST | Relative/idle time display. | `apps/editor/renderer/src/utils/timeFormat.js` |
| Avatar resolution & rotation | MUST | Stable avatar mapping + least-used selection. | `apps/editor/renderer/src/utils/agentAvatar.js` |
| Debug flags (`DEBUG_FLAGS`) | MUST | Dev-only debug toggles for UI/IPC flows; avoid ad-hoc localStorage keys. | `apps/editor/renderer/src/utils/debugFlags.js` |
| Session preview memory cache | MUST | Hover preview warmup + memory-first rendering; avoids disk on first hover. | `apps/editor/renderer/src/services/sessionMapPreviewCache.js` |
| Session Reply Relay | MUST | Session-side reply capture, routing, and asset storage for cross-agent comms. | `apps/editor/renderer/src/components/SessionReplyPanel.jsx` |

## Deprecations
- None currently.
