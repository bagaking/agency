---
title: Commander stays Session Map-scoped as a right-edge drawer
kind: decision
status: inbox
tags:
  - decision
  - commander
  - session-map
  - ui
sources:
  - openspec/changes/update-session-map-commander-drawer/design.md
  - apps/editor/renderer/src/components/sessionMap/SessionMapDockLayout.tsx
  - apps/editor/renderer/src/components/sessionMap/SessionMapCommanderPopup.tsx
  - docs/notes-session-management.md
created: 2026-03-27
---

## Candidate
- Decision: Commander keeps Session Map scope even after the larger drawer redesign.
- Why:
  - current Commander context is bound to Session Map focus session, active Harness run, and visible session error;
  - Agency already uses app-level right-side drawer semantics for HIL / Reply, so a window-global Commander drawer would blur product boundaries;
  - the stronger interaction change needed here was entry prominence + drawer stability, not a new cross-view assistant model.
- UI consequence:
  - move the Commander trigger to the far-right edge of the docked Session Map operational station;
  - open a full-height right-edge drawer within Session Map;
  - keep `Command Ops` as the persistent evidence layer under the same station.
- Do not reinterpret this implementation as approval for a shell-level global assistant. That would require a separate product/spec decision.

## Promote To
- `docs/.bagakit/memory/decision-commander-session-map-drawer-scope.md` (curated), or
- `docs/<type>-<topic>.md` (normative/deep guide)
