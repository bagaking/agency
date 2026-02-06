---
name: bagakit-living-docs
description: Create and maintain a living documentation + memory system for any project, including system-level docs (must-guidebook.md, must-sop.md, must-docs-taxonomy.md, must-memory.md), doc taxonomy rules, SOP generation from frontmatter, managed AGENTS.md injection blocks, required response footers, and a lightweight project memory layer (docs/.bagakit/{memory,inbox}/).
---

# Bagakit Living Docs

## Overview
Establish a self-updating documentation + memory system that stays accurate as the project evolves. This skill defines system docs, taxonomy rules, SOP generation, a project memory layer, and AGENTS.md injections.

Key idea:
- System-level rules live in `docs/must-*.md` (all `must-*` are mandatory reading in a target project).
- Other mechanisms (e.g. reusable-items governance, directives) are optional: adopt/modify/disable per the target project's own norms.

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
- Mention the system docs (`docs/must-*.md`) and when to open them.
- Require a response footer block (e.g., `[[BAGAKIT]]` + `- LivingDoc: ...`) after each task.
- Reinforce the must-guidebook and update rules three times in the block (repeat the key reminder; keep extra detail only once).

6) Default: Maintaining reusable items (可复用项维护)
- Always scaffold the governance entrypoint: `docs/norms-maintaining-reusable-items.md`.
- When the project shows signals for a domain, scaffold a starter reusable-items catalog (idempotent):
  - Coding projects: `docs/notes-reusable-items-coding.md`
  - UI projects: `docs/notes-reusable-items-design.md`
- Keep catalogs project-local and iterated; the "reusable" part is the items/content, not the template itself.

7) Maintenance rules
- When adding/renaming docs, update `must-docs-taxonomy.md` and `must-guidebook.md`.
- Keep naming prefixes consistent across docs (type-first).
- Keep system docs short and index-style; put details in domain docs.

## Templates and references
Templates live under `references/`.

- System docs:
  - `docs-taxonomy-template.md`
  - `guidebook-template.md`
  - `sop-template.md`
  - `memory-policy-template.md`
- Memory templates:
  - `memory-entry-template.md`
  - `memory-inbox-entry-template.md`
  - `memory-dir-readme-template.md`
  - `inbox-dir-readme-template.md`
- AGENTS managed block:
  - `agents-block-template.md`
- Optional helper docs:
  - `notes-continuous-learning-template.md`
  - `notes-adopting-living-docs-template.md` (existing-docs repos)
  - `notes-directives-examples-template.md`
  - `guidelines-doc-coauthoring-template.md`
  - `notes-project-charter-template.md` (suggested)
- Reusable items templates (under `references/reusable-items/`):
  - `norms-maintaining-reusable-items-template.md`
  - `notes-reusable-items-<domain>-template.md` (domains: coding/design/writing/knowledge)

## Scripts
Scripts live under `scripts/`.

- Apply templates + inject AGENTS block: `apply-living-docs.sh`
- Generate `docs/must-sop.md` from doc frontmatter: `bagakit_generate_sop.sh`
- Memory recall (search/get): `bagakit_memory.sh`
- Inbox helper (new/promote): `bagakit_inbox.sh`
- Session-to-inbox learning extractor: `bagakit_learning.sh` (uses `bagakit_learning.py`)
- Update helper (check remote vs local skill; apply into project): `bagakit_update.sh`
- Diagnostics (non-destructive): `bagakit_doctor.sh`
- Reusable-items query: `bagakit_reusable_items.sh` (uses `bagakit_reusable_items.py`)
- Optional: local SQLite FTS index: `bagakit_memory_index.py`
- Validate docs + memory conventions: `validate-docs.sh`
- Skill self-test: `test.sh`
