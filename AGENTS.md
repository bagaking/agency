<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

<!-- BAGAKIT:LIVEDOCS:START -->
Read `docs/must-guidebook.md` before working, and follow the update rules in `docs/must-docs-taxonomy.md` and `docs/must-memory.md`.
Follow `docs/must-sop.md` (generated from docs frontmatter). If SOP sources change, regenerate via `sh scripts/bagakit_generate_sop.sh .`.
If reusable-items governance/catalogs exist (e.g. `docs/norms-maintaining-reusable-items.md`, `docs/notes-reusable-items-*.md`), follow them and update them as the project evolves.
Before answering questions about prior work/decisions/todos/preferences: search `docs/.bagakit/memory/**/*.md`/`docs/.bagakit/inbox/**/*.md`/`docs/**/*.md` via `sh scripts/bagakit_memory.sh search '<query>'`, then use `sh scripts/bagakit_memory.sh get <path> --from <line> --lines <n>` to quote only needed lines.
Before creating new docs or memory entries, search first; prefer updating/merging an existing canonical entry over creating near-duplicates.
If you capture a new durable memory during work, write it to `docs/.bagakit/inbox/` using `sh scripts/bagakit_inbox.sh new <kind> <topic> --title '<title>'`, then promote after review with `sh scripts/bagakit_inbox.sh promote docs/.bagakit/inbox/<file>.md` (use `--merge` if the curated target already exists).
If Bagakit docs/memory/scripts are missing, bootstrap/update the project by running: `sh scripts/bagakit_update.sh --force` (or run apply from the installed skill directory).
When you change docs/memory rules or tooling, run `sh scripts/bagakit_doctor.sh .` and either apply suggested fixes or record a decision in inbox.

Read `docs/must-guidebook.md` before working; follow `docs/must-sop.md`; follow reusable-items governance; use recall (search -> get) for prior decisions.
Read `docs/must-guidebook.md`; in the final response, include the `[[BAGAKIT]]` footer block (LivingDoc + optional directives).

At the end of every response, include:
- `[[BAGAKIT]]`
- `- LivingDoc: <short note about which system doc rule was followed>`
- `  - (<DIRECTIVE>) <optional directive output when applicable>`
<!-- BAGAKIT:LIVEDOCS:END -->

Use pnpm for workspace Node dependencies and keep `pnpm-lock.yaml` committed.
