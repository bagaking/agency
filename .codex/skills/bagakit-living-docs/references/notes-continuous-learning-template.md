---
title: Continuous Learning (Default)
required: false
sop:
  - At the end of a Codex work session, capture a draft learning note into `docs/.bagakit/inbox/` (manual or via `sh scripts/bagakit_learning.sh extract --last`).
  - Weekly (or before major releases), review `docs/.bagakit/inbox/` and promote durable items into `docs/.bagakit/memory/`.
  - When promoting, keep entries short and source-linked; prefer `decision-*`/`preference-*`/`gotcha-*`/`howto-*` over long narratives.
---

# Continuous Learning (Default)

This project uses Bagakit memory (`docs/.bagakit/{inbox,memory}/`) to capture reusable patterns from day-to-day work.

## Why SOP (no hooks)
Codex does not provide reliable stop hooks. The SOP above is the default trigger mechanism.

