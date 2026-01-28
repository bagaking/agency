---
name: bagakit-living-docs
description: Create and maintain a living documentation system for any project, including system-level docs (must-guidebook.md, must-sop.md, must-docs-taxonomy.md), doc taxonomy rules, SOP generation from frontmatter, managed AGENTS.md injection blocks, and required response footers. Use when setting up or evolving documentation governance, naming conventions, or automated doc/SOP maintenance.
---

# Bagakit Living Docs

## Overview
Establish a self-updating documentation system that stays accurate as the project evolves. This skill defines system docs, taxonomy rules, SOP generation, and AGENTS.md injections.

## Workflow
1) Confirm doc root and system prefix
- Default doc root: `docs/`
- Default system prefix: `must-`
- Reuse existing prefix if the project already has one.

2) Create or update system docs
- `must-docs-taxonomy.md`: doc classification, naming rules, and frontmatter templates.
- `must-guidebook.md`: reading map; reference `must-docs-taxonomy.md` explicitly.
- `must-sop.md`: generated from doc frontmatter; do not hand-edit.
  - In `must-docs-taxonomy.md`, list doc categories first before other sections.

3) Enforce frontmatter for non-system docs
- Require `title`, `required`, and `sop` fields.
- SOP items must say when to read or update the doc.
- Regenerate `must-sop.md` whenever frontmatter changes.

4) Inject managed instructions into AGENTS.md
- Use a managed block like:
  - `<!-- BAGAKIT:LIVEDOCS:START -->`
  - `<!-- BAGAKIT:LIVEDOCS:END -->`
- Keep the block intact so automation can refresh it.
- Mention the three system docs and when to open them.
- Require a response footer (e.g., `[[Bagakit.LivingDoc]] ...`) after each task.
- Reinforce the must-guidebook and update rules three times in the block.

5) Maintenance rules
- When adding/renaming docs, update `must-docs-taxonomy.md` and `must-guidebook.md`.
- Keep naming prefixes consistent across docs (type-first).
- Keep system docs short and index-style; put details in domain docs.

## Templates and references
- Doc taxonomy template: `references/docs-taxonomy-template.md`
- Guidebook template: `references/guidebook-template.md`
- SOP output template: `references/sop-template.md`
- AGENTS managed block template: `references/agents-block-template.md`

## Scripts
- Apply templates and inject AGENTS block: `scripts/apply-living-docs.sh`
- Validate doc naming/frontmatter and AGENTS block: `scripts/validate-docs.sh`
