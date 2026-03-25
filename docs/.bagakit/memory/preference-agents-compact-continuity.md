---
title: AGENTS must be sufficient after compaction
kind: preference
tags:
  - preference
  - agents
  - continuity
  - compact
sources:
  - AGENTS.md
created: 2026-03-25
updated: 2026-03-25
confidence: low
---

## Candidate
- Treat `AGENTS.md` as the minimum continuity contract after context compaction or session reset.
- Important product, UX, architecture, and workflow standards must be recoverable from repo instructions, not only from transient chat history.
- Before ending a meaningful task, ask whether a future agent could resume correctly by reading `AGENTS.md` alone; if not, update `AGENTS.md` or add a canonical linked document.
- “Strongest brain” means strong reasoning plus durable preservation, not strong reasoning that disappears after reset.

## Promote To
- `docs/.bagakit/memory/preference-agents-compact-continuity.md` (curated), or
- `docs/<type>-<topic>.md` (normative/deep guide)
