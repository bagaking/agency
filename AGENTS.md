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

Use pnpm for workspace Node dependencies and keep `pnpm-lock.yaml` committed.
Keep repo-authored source in governed roots (`apps/`, `pkg/`, `scripts/`) TypeScript-only; do not add checked-in `.js`/`.cjs`/`.mjs` there. Generated output and vendor code are excluded, but source-of-truth JS is not allowed.

## Product Quality Bar

- Treat VS Code as a floor for desktop-shell correctness, not as the target ceiling.
- For overlapping desktop-editor behaviors, Agency should at least match macOS native expectations and VS Code-grade polish before adding custom product behavior.
- When Agency introduces agentic workflows, multi-window, multi-session, or multi-worktree affordances, the shipped UX should be meaningfully clearer and stronger than generic editor patterns, not merely “good enough compared to VS Code”.

## Interaction Design Bar

- Design quality: a shipped interaction must feel like one coherent system, not a pile of cards. Color, typography, spacing, iconography, motion, and hierarchy should reinforce one product identity.
- Originality: prefer deliberate product-specific composition over library-default or AI-default layouts. If a surface looks like stock dashboard scaffolding, keep pushing.
- Craft: typography hierarchy, spacing rhythm, contrast, and state treatment must be internally consistent. This is baseline execution quality, not optional polish.
- Functionality: the primary action, current context, and system status must be legible without guessing. Beauty does not excuse ambiguity.
- For important UX work, explicitly review the result against these four questions before stopping: `Does it feel whole?`, `Does it show intent?`, `Is the craft clean?`, `Can the user operate it without hesitation?`

## Quality Interrogation Loop

- Before considering a UX or desktop-shell task complete, explicitly ask: `Is this good enough yet?`
- If the answer is not a strong yes, keep refining semantics, polish, native behavior, hierarchy, and contextual clarity instead of stopping at “works”.
- Do not treat “roughly like VS Code” as completion. Treat it as the point where Agency becomes eligible for another improvement pass.

## Continuity And Memory Bar

- Treat `AGENTS.md` as the minimum post-compact survival contract for the project.
- After any important product, UX, architecture, or workflow decision, ask: `Could a future agent continue correctly by reading AGENTS.md alone?`
- If the answer is no, update `AGENTS.md` and/or link the canonical project doc before stopping.
- Do not leave critical standards as transient chat context. Durable standards must survive reset through repo instructions or project memory.
- Aim for the strongest available reasoning on each important decision; if a thought matters, it should be preserved in a form that later agents can reliably recover.

## Canonical Object Model

- Canonical domain objects are `App -> Window -> Project -> Cell -> Session -> Run`.
- When no project is selected, the window stays in a window-owned `Project Home` state; do not invent fake Project/Cell/Session objects just to reuse project-owned pipelines.
- The no-project `Home Shell` is a window-owned capability rooted at the user home directory; it must not create repo-backed Cell/session storage.
- `Agent Cells`, `Explorer`, `Workbench`, `Session Map`, `Hierarchy`, `Memo`, and `Commander` are surfaces over those objects, not competing object roots.
- HIL storage is bounded to `comment` / `memo` / `draft`; session replies are session-owned artifacts and must not be stored or surfaced as HIL inbox items.
- Session-source delivery must reference reply artifacts as `system=reply`; do not backdoor reply provenance through HIL refs.
- `Memo` is the primary user-facing noun for the artifact workspace; treat `HIL` as an internal/storage term and do not surface mixed labels like “Neural Comments” / “HIL Repository” for the same artifact family.
- `Create Cell` is the worktree-bound workspace action.
- Branch naming/prefix rules apply only when Agency creates a new branch; binding an existing branch or worktree must preserve the user-chosen branch identity instead of forcing it through create-time naming rules.
- `Create Agent` is the bounded child-execution action owned by a run.
- `Fork` is a specialized `Create Agent` strategy, not the default noun for workspace creation or child execution.
- For external automation, use the unified local control bus as the canonical surface over `Window / Project / Cell / Session / Run`.
- Do not add new ad-hoc CLI or socket transports over host capability owners when a control-bus operation is the right abstraction.
- `Commander` is one bounded operator capability over session/run context.
- The app-shell right-side station owns window-level attention triage and Commander briefing.
- In Session Map, `Ops` is the persistent evidence rail for the focused session/run, not the window-level queue surface.
- Agent Cells may only surface inline/local attention on owning Cell / Session affordances, and shell chrome stays compact.
- A Cell may exist with zero sessions; renderer/bootstrap must not auto-materialize a `Default` session just because a Cell is selected or attached. Session creation belongs to explicit runtime entry.
- When a Cell loses its live worktree attachment, Agent Cells sidebar must switch that Cell into cleanup-first projection instead of treating it like a normal development card; `Archive Cell` is the primary sidebar action, while `Delete Cell` and attachment-metadata cleanup stay in the selected Cell details pane.
- Do not model `Commander` as a window-global assistant or reuse HIL/Reply drawer semantics for it.
