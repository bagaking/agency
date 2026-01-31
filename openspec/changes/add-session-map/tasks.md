## 1. Implementation
- [x] 1.1 Add map overlay entrypoint in status bar (global across screens).
- [x] 1.2 Aggregate Cells + Sessions into map model (status, offline/online, counts).
- [x] 1.3 Render Cell clusters with faction coloring and labels.
- [x] 1.4 Render Session role tokens with status indicators and tooltips.
- [x] 1.5 Implement click-to-jump navigation to target session (keep current screen).
- [x] 1.6 Add live terminal preview on hover and allow click-to-jump from preview.
- [x] 1.7 Add compact stats header (total cells/sessions/online/offline).
- [x] 1.8 Provide overflow handling (scroll container) for large counts.
- [x] 1.9 Default-open the map on first entry per project and persist dismissal.
- [x] 1.10 Add faction color defaults (Cell type + creation order) and config overrides.

## 2. Validation
- [ ] 2.1 Manual: map overlay visible on all main screens; toggles from status bar.
- [ ] 2.2 Manual: clicking a session jumps to that Cell + session.
- [ ] 2.3 Manual: archived/closed/stale sessions render as offline state.
- [ ] 2.4 Manual: tooltips show dynamic session details and live preview on hover.
- [ ] 2.5 Manual: clicking the hover preview jumps to the session.
- [ ] 2.6 Manual: large number of sessions remains usable (scroll + stats).
- [ ] 2.7 Manual: first entry auto-opens the map; subsequent entries respect toggle.
