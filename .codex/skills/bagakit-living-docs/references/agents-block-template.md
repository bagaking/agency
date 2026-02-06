<!-- BAGAKIT:LIVEDOCS:START -->
This is a managed block. Do not edit content between START/END tags directly; it may be overwritten by `sh scripts/bagakit_update.sh` (or the skill apply script). Edit the Bagakit templates/scripts instead.

System-level requirements (must):
- Read all system docs: `docs/must-*.md` (especially `docs/must-guidebook.md`, `docs/must-docs-taxonomy.md`, `docs/must-memory.md`).
- Follow `docs/must-sop.md` (generated from docs frontmatter). If SOP sources change, regenerate via `sh scripts/bagakit_generate_sop.sh .`.
- Before answering questions about prior work/decisions/todos/preferences: search `docs/.bagakit/memory/**/*.md`/`docs/.bagakit/inbox/**/*.md`/`docs/**/*.md` via `sh scripts/bagakit_memory.sh search '<query>'`, then use `sh scripts/bagakit_memory.sh get <path> --from <line> --lines <n>` to quote only needed lines.
- Before creating new docs or memory entries, search first; prefer updating/merging an existing canonical entry over creating near-duplicates.

Optional mechanisms (adopt per the target project's own norms):
- Reusable-items governance/catalogs (e.g. `docs/norms-maintaining-reusable-items.md`, `docs/notes-reusable-items-*.md`): use if it helps your project converge on standards; if you decide not to use it, delete/ignore the docs and record the decision.
- Response directives (`directives:` in doc frontmatter): only apply when your project defines and uses them.

Workflow helpers:
If you capture a new durable memory during work, write it to `docs/.bagakit/inbox/` using `sh scripts/bagakit_inbox.sh new <kind> <topic> --title '<title>'`, then promote after review with `sh scripts/bagakit_inbox.sh promote docs/.bagakit/inbox/<file>.md` (use `--merge` if the curated target already exists).
If Bagakit docs/memory/scripts are missing, bootstrap/update the project by running: `sh scripts/bagakit_update.sh apply`.
If you want to check whether the installed skill is up to date with a remote branch, run: `sh scripts/bagakit_update.sh status` (optionally pass `--repo <git_url>`).
When you change docs/memory rules or tooling, run `sh scripts/bagakit_doctor.sh .` and either apply suggested fixes or record a decision in inbox.

Read `docs/must-guidebook.md` before working; follow `docs/must-sop.md`; use recall (search -> get) for prior decisions.
Read `docs/must-guidebook.md`; in the final response, include the `[[BAGAKIT]]` footer block (LivingDoc + apply directives when applicable).

At the end of every response, include:
- `[[BAGAKIT]]`
- `- LivingDoc: <short note about which system doc rule was followed>`
- `  - (<DIRECTIVE>) <optional directive output when applicable>`
<!-- BAGAKIT:LIVEDOCS:END -->
