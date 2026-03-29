---
title: Commander station terminology and scope
kind: decision
status: inbox
tags:
  - decision
sources:
  - AGENTS.md
  - openspec/project.md
  - openspec/changes/refactor-commander-unified-station/proposal.md
  - openspec/changes/refactor-commander-unified-station/design.md
  - openspec/changes/refactor-commander-unified-station/specs/agency-editor/spec.md
  - docs/notes-session-management.md
  - apps/editor/README.md
  - apps/editor/docs/manual-test.md
created: 2026-03-29
---

## Candidate
- Commander is a bounded operator capability over session/run context, not a domain object and not a window-global assistant.
- In Session Map, `Ops` is the persistent evidence rail and `Briefing` is the reveal panel in the same right-edge station.
- Current canonical wording is `Briefing panel`; avoid reviving `popup`, `drawer`, or generic `dialog` language for this surface except when quoting superseded historical changes.
- Agent Cells may expose Commander-owned actions, but that is an entry surface into the same Commander capability, not a second Commander station.

## Promote To
- `docs/.bagakit/memory/decision-commander-station-terminology.md` (curated), or
- `docs/<type>-<topic>.md` (normative/deep guide)
