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

Use pnpm for workspace Node dependencies and keep `pnpm-lock.yaml` committed.
Read `docs/guidebook.md` before working.
Follow `docs/sop.md` (generated from docs frontmatter). If SOP sources change, regenerate via `node scripts/generate-sop.mjs`.
See `docs/dev-norms.md` for detailed engineering norms.
At the end of every response, include a single line:
- `[[Agency]] 本次修改参考了 doc/guidebook.md 中的 xxx 原则`
- If none apply, use: `[[Agency]] 本次修改无需引用 doc/guidebook.md`
