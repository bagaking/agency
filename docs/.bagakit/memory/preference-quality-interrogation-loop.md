---
title: Keep asking whether the result is good enough
kind: preference
tags:
  - preference
  - quality
  - review-loop
sources:
  - AGENTS.md
created: 2026-03-25
updated: 2026-03-25
confidence: low
---

## Candidate
- During implementation and design review, keep explicitly asking: `Is this good enough yet?`
- `Works` is not a sufficient stop condition for UI, desktop-shell, or workflow design tasks.
- If the result still feels generic, semantically muddy, under-polished, or merely VS Code-level, continue refining.
- This preference should survive session resets by living in both repo instructions (`AGENTS.md`) and project memory.

## Promote To
- `docs/.bagakit/memory/preference-quality-interrogation-loop.md` (curated), or
- `docs/<type>-<topic>.md` (normative/deep guide)
