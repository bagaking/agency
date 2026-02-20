---
name: bagakit-git-commit-spec
description: Plan and write high-signal Git commits with proactive split strategy and TOML-frontmatter-backed spec-style commit messages. Use when changes need clearer commit timing, atomic split boundaries, and explainable history.
---

# Bagakit Git Commit Spec

One bounded workflow: `working diff -> split plan -> commit meta+message spec -> commit + archive evidence`.

## Purpose

- Keep commit history clear for review, rollback, and long-term archaeology.
- Keep workflow standalone-first: it must work in any Git repo without mandatory external systems.
- Make commit quality observable through a fixed metadata schema + GFM body + lint gate.

## When to Use This Skill

- User asks to improve commit quality, commit timing, or commit message clarity.
- User has mixed changes and asks how to split commits proactively.
- User wants commit messages or PR context to act as mini-specs.
- User wants to preserve workflow context (ftharness/openspec/long-run) in commit history.

## When NOT to Use This Skill

- User explicitly says no commit should be created yet.
- Repo has no Git context (or commit rights are unavailable).
- User only needs one-line temporary checkpoint messages with no quality constraints.

## Input Contract

- Required: Git repository root and current change set.
- Required: target quality bar (`minimal` / `review-ready` / `release-ready`).
- Optional: local conventions (`CONTRIBUTING.md`, commitlint, PR templates, existing history).
- Optional driver context:
  - feat-task-harness (`feat/task/status/completion`),
  - openspec (`change/status/completion`),
  - long-run (`item/status/progress`).
- Optional knowledge activities:
  - brainstorm,
  - spec writing,
  - skill adjustment,
  - docs deposition.
- Cross-skill integration is optional contract-driven only (no mandatory direct flow-calls).

## Commit Timing Gate (When to Commit)

Commit when all are true:

1. One atomic intent is complete.
2. Validation evidence exists (command, check, or explicit rationale).
3. Rollback boundary is clear.
4. Spec-style message draft passes lint gate.

Do not commit yet when:

- unrelated concerns are mixed in one staged set,
- known failing checks are unexplained,
- intent is exploratory and not stable.

Checkpoint exceptions (allowed with explicit rationale):

- long-running refactor checkpoint,
- operator handoff/context-switch snapshot,
- risk-control checkpoint before invasive mutation.

## Split Strategy (Proactive Decomposition)

- Split by behavioral intent, not by file count.
- Typical axes:
  - feature/fix logic,
  - tests,
  - docs,
  - config/tooling,
  - mechanical rename/reformat.
- Prefer order:
  1. structural/mechanical groundwork,
  2. behavior change,
  3. tests/docs/follow-up.

## Fixed Commit Meta Contract (First-Class)

Commit message body is treated as Markdown with required frontmatter.

Subject line:

`<type>(<scope>): <summary>`

Then required TOML frontmatter (`schema=bagakit.commit-spec/v3`) with fixed keys:

- `goal_target`, `goal_status`, `goal_completion`
- `driver`, `driver_meta`
- `activity_brainstorm`, `activity_spec`, `activity_skill`, `activity_docs`
- `module_count` and session metadata

Required GFM sections:

- `## Purpose`
- `## Why This Change`
- `## Goal Status`
- `## Changes by Module`
- `## Learnings and Cases`
- `## Validation`
- `## Driver Context`
- `## Knowledge Activities`
- `## Remaining Work`

`## Changes by Module` must include key references (`path:line`) for critical deltas.
`## Remaining Work` uses per-item template in `reference/tpl/remaining-work-item-template.md`.

## Git Hook Template Policy

- Provide commit-msg hook template under `scripts/templates/commit-msg-template.sh`.
- Hook installation is optional but strongly recommended.
- On project init, ask user whether to install hook (`--install-hooks ask|yes|no`).
- Hook validates commit message spec before final commit creation.

## Output Routes and Default Mode

- Deliverable type: execution/result-heavy commit-quality skill.
- `action-handoff`:
  - default: Git commits on current branch + `.bagakit/commit-spec/<session>/split-plan.md`.
  - optional adapter: feat-task-harness task commit flow.
- `memory-handoff`:
  - default: `.bagakit/commit-spec/<session>/memory.md`.
  - optional adapter: `docs/.bagakit/inbox/` or `docs/.bagakit/memory/` when living-docs exists.
- `archive`:
  - default: `.bagakit/commit-spec/<session>/archive.md`.
- Routing stays rule-driven and fallback-safe.

## Archive Gate (Completion Handoff)

- Every produced output must have explicit destination evidence.
- Archive record must include:
  - action handoff destination,
  - memory handoff destination (or explicit `none` rationale),
  - archive destination,
  - commit hash list and check evidence.
- Completion blocked until action/memory/archive destinations are explicit, and commit/check evidence is attached.

## Workflow

0) Search-first convention discovery.
- Inspect local standards first (`CONTRIBUTING.md`, commitlint, PR templates, history).
- If unclear, consult `reference/discovery-log.md` and choose best compatible baseline.

1) Initialize session (and optionally install hooks).
- Run:
```bash
sh scripts/bagakit-git-commit-spec.sh init --root . --topic "<topic>" --install-hooks ask
```

2) Build change inventory and split suggestion.
- Run:
```bash
sh scripts/bagakit-git-commit-spec.sh inventory --root . --dir <session-dir>
```
- Review generated split groups and adjust by intent boundary.

3) Draft commit message as spec (meta + GFM).
- Run:
```bash
sh scripts/bagakit-git-commit-spec.sh draft-message \
  --root . \
  --dir <session-dir> \
  --type <feat|fix|refactor|docs|test|chore> \
  --scope <scope> \
  --summary "<summary>" \
  --purpose "<why this commit>" \
  --why-before "<pre-change state + pain/limit>" \
  --why-change "<what changed in this commit>" \
  --why-gain "<incremental gain/benefit vs previous state>" \
  --goal-target "<target objective>" \
  --goal-status <complete|partial|in_progress|blocked> \
  --goal-completion "<done vs remaining>" \
  --module "<module>|<scope>|<summary>|<path:line refs>" \
  --learning "<key experience/case; debug loop or new insight>" \
  --remaining-item "<what one sentence>|<why pending one sentence>|<plan one sentence>" \
  --check "<command/evidence>" \
  --driver "<none|ftharness|openspec|longrun|custom>" \
  --driver-meta "feat=<id>; task=<id>; status=<...>; completion=<x/y>" \
  --activity-brainstorm "<none|summary>" \
  --activity-spec "<none|summary>" \
  --activity-skill "<none|summary>" \
  --activity-docs "<none|summary>"
```

4) Lint message gate.
- Run:
```bash
sh scripts/bagakit-git-commit-spec.sh lint-message --message <message-file>
```

5) Execute commit loop.
- Stage one split group at a time, then:
```bash
git commit -F <message-file>
```
- Record hash/evidence in session `progress.md`.

6) Archive and handoff.
- Run:
```bash
sh scripts/bagakit-git-commit-spec.sh archive \
  --root . \
  --dir <session-dir> \
  --action-dest "git:<branch>" \
  --memory-dest ".bagakit/commit-spec/<session>/memory.md" \
  --commit <sha1> --commit <sha2> \
  --check-evidence "lint-message passed" \
  --check-evidence "tests: <command>"
```

## Fallback Path (No Clear Fit)

- If not inside Git repo, stop and return setup checklist.
- If split boundaries remain ambiguous, ask one clarification question about intent ownership.
- If no stable split is possible, recommend one safe checkpoint commit plus explicit risk note.

## Validation Matrix

- Positive: "帮我把这批改动拆成清晰 commits 并生成可解释 message" -> should trigger.
- Positive: "I need commit/PR context as spec with workflow status and key refs" -> should trigger.
- Negative: "只帮我修一下代码，不要提交" -> should not trigger.
- Negative: "Translate this markdown" -> should not trigger.

## References

- `reference/discovery-log.md`
- `reference/meta-schema.md`
- `reference/commit-message-spec-guide.md`
- `reference/split-strategy-guide.md`
- `reference/hook-install-guide.md`
- `reference/tpl/remaining-work-item-template.md`

## `[[BAGAKIT]]` Footer Contract

```text
[[BAGAKIT]]
- LivingDoc: Evidence=<memory destination and summary file>
- LongRun: Item=<id>; Status=<in_progress|done|blocked>; Evidence=<commit hashes/checks>; Next=<next deterministic command>
- CommitSpec: Stage=<discover|split|draft|lint|commit|archive>; Evidence=<session files + lint/check>; Next=<next commit action>
```
