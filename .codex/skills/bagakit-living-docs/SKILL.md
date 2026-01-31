---
name: bagakit-living-docs
description: Create and maintain a living documentation + memory system for any project, including system-level docs (must-guidebook.md, must-sop.md, must-docs-taxonomy.md, must-memory.md), doc taxonomy rules, SOP generation from frontmatter, managed AGENTS.md injection blocks, required response footers, and a lightweight project memory layer (docs/.bagakit/{memory,inbox}/).
---

# Bagakit Living Docs

## Overview
Establish a self-updating documentation + memory system that stays accurate as the project evolves. This skill defines system docs, taxonomy rules, SOP generation, a project memory layer, and AGENTS.md injections.

## Workflow
1) Confirm doc root and system prefix
- Default doc root: `docs/`
- Default system prefix: `must-`
- Reuse existing prefix if the project already has one.

2) Create or update system docs
- `must-docs-taxonomy.md`: doc classification, naming rules, and frontmatter templates.
- `must-guidebook.md`: reading map; reference `must-docs-taxonomy.md` explicitly.
- `must-sop.md`: generated from doc frontmatter; do not hand-edit.
- `must-memory.md`: memory conventions (how to write, search, and promote memory).
  - In `must-docs-taxonomy.md`, list doc categories first before other sections.

3) Enforce frontmatter for non-system docs
- Require `title`, `required`, and `sop` fields.
- SOP items must say when to read or update the doc.
- Regenerate `must-sop.md` whenever frontmatter changes.

4) Add project memory layer
- Curated memory: `docs/.bagakit/memory/**/*.md`
- Inbox (unreviewed): `docs/.bagakit/inbox/**/*.md`
- Capture candidates in `docs/.bagakit/inbox/`, then promote into `docs/.bagakit/memory/` (durable) or `docs/` (normative/deep).
- Before answering questions about prior work/decisions/todos/preferences: search first, then quote only needed lines.

5) Inject managed instructions into AGENTS.md
- Use a managed block like:
  - `<!-- BAGAKIT:LIVEDOCS:START -->`
  - `<!-- BAGAKIT:LIVEDOCS:END -->`
- Keep the block intact so automation can refresh it.
- Mention the three system docs and when to open them.
- Require a response footer (e.g., `[[Bagakit.LivingDoc]] ...`) after each task.
- Reinforce the must-guidebook and update rules three times in the block.

6) Maintenance rules
- When adding/renaming docs, update `must-docs-taxonomy.md` and `must-guidebook.md`.
- Keep naming prefixes consistent across docs (type-first).
- Keep system docs short and index-style; put details in domain docs.

## Templates and references
- Doc taxonomy template: `references/docs-taxonomy-template.md`
- Guidebook template: `references/guidebook-template.md`
- SOP output template: `references/sop-template.md`
- Memory policy template: `references/memory-policy-template.md`
- Default continuous-learning SOP doc template: `references/notes-continuous-learning-template.md`
- Memory entry template: `references/memory-entry-template.md`
- Memory inbox entry template: `references/memory-inbox-entry-template.md`
- Memory dir README template: `references/memory-dir-readme-template.md`
- Inbox dir README template: `references/inbox-dir-readme-template.md`
- AGENTS managed block template: `references/agents-block-template.md`

## Scripts
- Apply templates, inject AGENTS block, and install helper tools: `scripts/apply-living-docs.sh`
- Generate `docs/must-sop.md` from doc frontmatter: `scripts/bagakit_generate_sop.sh`
- Search/get project memory + docs (POSIX sh): `scripts/bagakit_memory.sh`
- Inbox helper (create/promote memory candidates): `scripts/bagakit_inbox.sh`
- Session-to-inbox "learning" helper (Codex sessions -> draft inbox entry): `scripts/bagakit_learning.sh`
- Doctor (diagnose docs/memory health and suggest improvements): `scripts/bagakit_doctor.sh`
- Optional: build a local SQLite FTS index for faster search: `scripts/bagakit_memory_index.py index`
- Validate docs + memory conventions: `scripts/validate-docs.sh`
- Repo self-test: `scripts/test.sh`
