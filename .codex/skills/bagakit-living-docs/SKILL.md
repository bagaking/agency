---
name: bagakit-living-docs
description: Create and maintain a living documentation + memory system for any project. Use when you need mandatory system docs, managed AGENTS injection, SOP generation from frontmatter, and a project-local memory layer.
---

# Bagakit Living Docs

## Standalone-First Contract
- This skill is standalone-first: it can run with only this repo's scripts and references.
- Cross-skill collaboration is optional and signal/contract-based (import/export/evolve JSON/markdown artifacts), never direct mandatory flow coupling.
- Tooling resolves to `${BAGAKIT_HOME:-$HOME/.bagakit}/skills/bagakit-living-docs` by default.

## When to Use
- A project needs stable `docs/must-*.md` governance and deterministic doc update workflow.
- A project needs `AGENTS.md` managed block injection with `[[BAGAKIT]]` footer discipline.
- A project needs memory capture/search/promotion (`docs/.bagakit/{inbox,memory}`) for long-running collaboration.

## When NOT to Use
- You only need one-off documentation output and no reusable process/tooling.
- You want this skill to hard-depend on another specific skill runtime.
- You need a full project/task execution harness rather than docs/memory governance.

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

## `[[BAGAKIT]]` Footer Contract
Use a footer block after each task update:

```text
[[BAGAKIT]]
- LivingDoc: Docs=<updated docs>; Memory=<captured/promoted/none>; Evidence=<commands/checks>; Next=<one deterministic next action>
```

## Templates and references
Templates live under `references/tpl/`.

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
- Reusable items templates (under `references/tpl/reusable-items/`):
  - `norms-maintaining-reusable-items-template.md`
  - `notes-reusable-items-<domain>-template.md` (domains: coding/design/writing/knowledge)

## Scripts
Scripts live under `scripts/`.

- Apply templates + inject AGENTS block: `apply-living-docs.sh`
- Generate `docs/must-sop.md` from doc frontmatter: `living-docs-generate-sop.sh`
- Memory recall (search/get): `living-docs-memory.sh`
- Inbox helper (new/suggest-skill/promote): `living-docs-inbox.sh`
- Session-to-inbox learning extractor: `living-docs-learning.sh` (uses `living-docs-learning.py`)
- Contract-signal exchange + evolution: `living-docs-learning-contract.sh` (uses `living-docs-learning-contract.py`)
- Update helper (check remote vs local skill; apply into project): `living-docs-update.sh`
- Diagnostics (non-destructive): `living-docs-doctor.sh`
- Reusable-items query: `living-docs-reusable-items.sh` (uses `living-docs-reusable-items.py`)
- Optional: local SQLite FTS index: `living-docs-memory-index.py`
- Validate docs + memory conventions: `validate-docs.sh`
- Skill self-test: `scripts_dev/test.sh`

## Output Routes and Default Mode
- Deliverable type: memory/governance skill for documentation standards and durable knowledge flow.
- Action handoff output (default route): updated `docs/must-*.md`, managed `AGENTS.md` block, and generated SOP files under the project docs path.
- Memory handoff output (default route): inbox/memory artifacts under `docs/.bagakit/{inbox,memory}/`.
- Optional adapter routes: external task/spec systems can consume docs or memory files through optional integration contracts only.
- Adapter policy: optional and rule-driven; no direct hard dependency is required for standalone operation.

## Archive Gate (Completion Handoff)
- Completion archive must record destination path/id for `action_handoff` (which docs/scripts changed) and `memory_handoff` (where summary/memory entries were deposited, or explicit `none` rationale).
- Do not mark completion until docs regeneration/validation evidence exists and archive destination report is explicit.

## Fallback Path
- If the target project cannot adopt full living-docs right now, apply only system docs + AGENTS managed block first, then add memory and reusable-items in later rounds.
