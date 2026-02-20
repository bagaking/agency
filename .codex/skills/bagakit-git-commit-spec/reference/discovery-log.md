# Discovery Log (Search-First)

This log captures baseline sources reviewed before (and during) design of this skill.

## Decision Summary

- Reuse: strict commit protocol ideas from local `bagakit-feat-task-harness` as optional adapter target.
- Reuse: Conventional Commits subject grammar as portable default baseline.
- Reuse: official Git docs for staging split and structured trailers.
- Adapt: PR/review/CI-related skills as surrounding workflow signals (not core commit-spec contract).
- Build new: no standalone Bagakit skill found that combines split strategy + fixed frontmatter + commit-as-spec gate.

## Source Comparison

| Source | Finding | Decision | Reason |
| --- | --- | --- | --- |
| `skills/skills/bagakit-feat-task-harness/SKILL.md` | Strict task-level commit protocol (`Plan/Check/Learn` + trailers). | adapt | Strong for harness environments; too task-system-specific as universal default. |
| https://www.conventionalcommits.org/en/v1.0.0/ | Standard `<type>(scope): summary` grammar. | reuse | Portable, predictable, automation-friendly subject baseline. |
| https://git-scm.com/docs/git-add | `git add -p` enables hunk-level split. | reuse | Critical for proactive split-by-intent execution. |
| https://git-scm.com/docs/git-commit | Canonical commit message and commit mechanics. | reuse | Source of truth for commit behavior and `-F` message workflow. |
| https://git-scm.com/docs/git-interpret-trailers | Structured trailer semantics. | reuse | Supports parseable metadata without hard coupling. |
| https://raw.githubusercontent.com/openai/skills/main/skills/.curated/gh-address-comments/SKILL.md | PR comment handling workflow via `gh`. | adapt | Useful for PR feedback loop; complementary to commit-spec core. |
| https://raw.githubusercontent.com/openai/skills/main/skills/.curated/gh-fix-ci/SKILL.md | CI failure triage and fix workflow for PR checks. | adapt | Useful source for `Validation` evidence discipline. |
| https://raw.githubusercontent.com/openai/skills/main/skills/.curated/yeet/SKILL.md | Stage/commit/push/PR end-to-end flow. | adapt | Execution accelerator; commit quality contract still needed upstream. |
| https://raw.githubusercontent.com/CommandCodeAI/agent-skills/main/skills/changelog-generator/SKILL.md | Derives release notes from commit history. | adapt | Demonstrates downstream value of high-signal commit metadata. |
| https://raw.githubusercontent.com/CommandCodeAI/agent-skills/main/skills/requesting-code-review/SKILL.md | Structured review request workflow. | adapt | Useful for commit-to-review handoff quality criteria. |
| https://raw.githubusercontent.com/CommandCodeAI/agent-skills/main/skills/receiving-code-review/SKILL.md | Structured handling of review feedback. | adapt | Useful for follow-up commits and rationale clarity. |
| https://raw.githubusercontent.com/CommandCodeAI/agent-skills/main/skills/using-git-worktrees/SKILL.md | Worktree isolation process. | adapt | Improves commit atomicity by reducing workspace interference. |
| https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests | PR semantics baseline. | reuse | Aligns commit-spec output with PR-level communication expectations. |
| https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests | Issue/PR templates. | adapt | Reinforces frontmatter + structured body model at PR layer. |

## Notes

- Initial discovery date: 2026-02-20
- Expanded reference pass: 2026-02-21
- Scope decision: standalone-first commit quality skill with optional workflow-driver fields (`ftharness/openspec/long-run`) and first-class activity fields (`brainstorm/spec/skill/docs`).
