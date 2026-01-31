<!-- BAGAKIT:LIVEDOCS:START -->
Read `docs/must-guidebook.md` before working, and follow the update rules in `docs/must-docs-taxonomy.md` and `docs/must-memory.md`.
Follow `docs/must-sop.md` (generated from docs frontmatter). If SOP sources change, regenerate via `sh scripts/bagakit_generate_sop.sh .`.
Before answering questions about prior work/decisions/todos/preferences: search `docs/.bagakit/memory/**/*.md`/`docs/.bagakit/inbox/**/*.md`/`docs/**/*.md` via `sh scripts/bagakit_memory.sh search '<query>'`, then use `sh scripts/bagakit_memory.sh get <path> --from <line> --lines <n>` to quote only needed lines. (Optional: `python3 scripts/bagakit_memory_index.py index` for faster search.)
If you capture a new durable memory during work, write it to `docs/.bagakit/inbox/` using `sh scripts/bagakit_inbox.sh new <kind> <topic> --title '<title>'`, then promote after review with `sh scripts/bagakit_inbox.sh promote docs/.bagakit/inbox/<file>.md`.
When you change docs/memory rules or tooling, run `sh scripts/bagakit_doctor.sh .` and either apply suggested fixes or record a decision in inbox.

Read `docs/must-guidebook.md` before working; follow `docs/must-docs-taxonomy.md` and `docs/must-memory.md`.
Follow `docs/must-sop.md` (generated from docs frontmatter). If SOP sources change, regenerate via `sh scripts/bagakit_generate_sop.sh .`.
Before answering questions about prior work/decisions/todos/preferences: search `docs/.bagakit/memory/**/*.md`/`docs/.bagakit/inbox/**/*.md`/`docs/**/*.md` via `sh scripts/bagakit_memory.sh search '<query>'`, then use `sh scripts/bagakit_memory.sh get <path> --from <line> --lines <n>` to quote only needed lines. (Optional: `python3 scripts/bagakit_memory_index.py index` for faster search.)
If you capture a new durable memory during work, write it to `docs/.bagakit/inbox/` using `sh scripts/bagakit_inbox.sh new <kind> <topic> --title '<title>'`, then promote after review with `sh scripts/bagakit_inbox.sh promote docs/.bagakit/inbox/<file>.md`.
When you change docs/memory rules or tooling, run `sh scripts/bagakit_doctor.sh .` and either apply suggested fixes or record a decision in inbox.

Read `docs/must-guidebook.md`; follow `docs/must-docs-taxonomy.md` and `docs/must-memory.md`.
Follow `docs/must-sop.md` (generated from docs frontmatter). If SOP sources change, regenerate via `sh scripts/bagakit_generate_sop.sh .`.
Before answering questions about prior work/decisions/todos/preferences: search `docs/.bagakit/memory/**/*.md`/`docs/.bagakit/inbox/**/*.md`/`docs/**/*.md` via `sh scripts/bagakit_memory.sh search '<query>'`, then use `sh scripts/bagakit_memory.sh get <path> --from <line> --lines <n>` to quote only needed lines. (Optional: `python3 scripts/bagakit_memory_index.py index` for faster search.)
If you capture a new durable memory during work, write it to `docs/.bagakit/inbox/` using `sh scripts/bagakit_inbox.sh new <kind> <topic> --title '<title>'`, then promote after review with `sh scripts/bagakit_inbox.sh promote docs/.bagakit/inbox/<file>.md`.
When you change docs/memory rules or tooling, run `sh scripts/bagakit_doctor.sh .` and either apply suggested fixes or record a decision in inbox.
At the end of every response, include a single line:
- `[[Bagakit.LivingDoc]] <short note about which system doc rule was followed>`
<!-- BAGAKIT:LIVEDOCS:END -->
