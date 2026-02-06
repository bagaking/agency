# Design: Agent Session Map overlay

## Layout
- Map is a global overlay anchored to the status bar center; toggled by clicking the status-bar map slot.
- Map auto-opens on first entry (per project), thereafter only opens on user toggle.
- Map panel is a fixed-height strip (RTS minimap feel), spanning center width with internal scroll for overflow.
- Layout strategy (v1): single-row or grid of "Cell clusters"; within each cluster, Sessions are rendered as small role tokens.

## Visual Semantics
- Cell cluster = "city/team" (faction color + badge + label).
- Default faction colors: derived from Cell type and creation order; allow overrides via config.
- Session token = "role" (icon + status dot). Archived/Closed/Stale = muted/offline state.
- Hover reveals dynamic details (last command, idle time, status) and a live terminal preview thumbnail.

## Interaction
- Click Session token: jump to the session (select Cell + session tab; keep current screen).
- Hover: tooltip with details + live terminal preview; click the preview to jump to the session.
- No drag/zoom/fog in v1.

## Attach Manager & Preview Cache
- Centralize attach/detach logic in a session-level manager used by terminal attach, hover preview, and snapshot capture.
- Lazy attach on demand: if a session is not attached, attach briefly to capture a preview/snapshot, then detach if no interactive client remains.
- Idle-based attach GC: detach attach clients after `idleTimeout` (default 30 min) **only** when the session has no active interactive client; reattach immediately on interaction.
- Attach activity must not reset idle; ignore attach noise within a one-minute grace window.
- Preview cache: keep 2–3 recent frames per session in memory and persist under `.agency/` to speed up hover previews after restart.

## Data Sources
- Cells and Sessions from existing renderer state (sessions registry, cell lifecycle state).
- Offline state derived from session status (closed/archived/stale).
- Faction color overrides from project-level config (exact storage TBD in implementation).
- Snapshot store: `.agency/session-previews/<sessionId>/` (format and metadata defined in implementation).

## Performance & Scale
- Use compact tokens and scrolling containers to handle large counts.
- Show totals (cells/sessions/online/offline) in header.

## Accessibility
- Ensure tooltips and icons have labels; clickable tokens meet 44px target or equivalent.
- Keyboard focusable tokens with visible focus ring.
