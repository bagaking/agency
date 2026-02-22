---
name: bagakit-paperwork-technical-writing
description: Use when you need to write or rewrite technical articles into publishable and executable outputs with objective quality gates and optional expert-forum validation.
---

# Bagakit Paperwork Technical Writing

Deliver technical writing that is readable for publication and actionable for execution.

## Purpose

- Turn messy technical discussions into structured, reviewable articles.
- Keep writing quality explicit through objective checks and repeatable review steps.
- Keep output split clear: publication narrative vs execution appendix.
- Keep workflow standalone-first: core drafting and checks run locally without mandatory external systems.
- Prevent regression by carrying forward proven strengths from prior versions.
- Prevent high-compression rewrites from dropping baseline evidence classes.
- Default to full first-draft quality instead of incremental short scaffolds.

## When to Use This Skill

- You need to draft, rewrite, or polish a technical blog, RFC-style article, or engineering postmortem.
- You need writing that is both externally readable and internally actionable.
- You need a traceable writing loop with clear gates and revision evidence.

## When NOT to Use This Skill

- You only need translation or grammar-only proofreading.
- You need marketing copy or brand storytelling not tied to engineering logic.
- You only need free-form brainstorming without publication/execution output constraints.

## Input Contract

- Required:
  - Topic and target reader.
  - One source of truth (notes, draft, transcript, or prior article).
- Strongly recommended:
  - Success criteria (for example: publish readability, handoff readiness).
  - Constraints (deadline, length range, tone, prohibited claims).
- Optional:
  - External references for evidence.
  - Prior audit feedback.

## Output Routes and Default Mode

- Deliverable archetype/type: technical-writing transformation skill (`source notes/draft -> publishable article + execution handoff`).
- Action handoff output: `execution_appendix.md` with run steps, checks, and rollback notes.
- Memory handoff output: `review_report.md` with change summary, quality evidence, and residual risk.
- Default route behavior (no adapter): write all outputs locally in the active working directory and keep paths explicit in final response.
- Adapter policy: optional adapter routes are allowed, but this skill is standalone-first and must work with no adapter.
- First-draft default: article must already meet profile-level density checks (word floor, cases, evidence anchors).
- Required outputs:
  - `article.md`: publication-oriented main text.
  - `execution_appendix.md`: field-level checks, gates, and operational notes.
  - `review_report.md`: what changed, what improved, what remains.
- Optional outputs:
  - `outline.md`: structured outline before drafting.
  - `forum_minutes.md`: when expert-forum review is enabled.

## Non-Negotiable Boundary

- `article.md` is publish-only narrative.
- Internal process metadata and directives must not appear in `article.md`.
- Execution fields (`discussion_clear`, `user_review_status`, claim/tool validation, handoff path) belong to `execution_appendix.md`.
- Stage/gate tracking belongs to `review_report.md` (or response footer), not to publish copy.

## Archive Gate (Completion Handoff)

- Verify all required outputs exist and include concrete file paths in handoff.
- Archive status can be `complete` only when hard gates pass and unresolved placeholders are zero.
- Record both handoff directions explicitly: `action_handoff -> execution_appendix.md`, `memory_handoff -> review_report.md`.
- If any hard gate fails, stop at review mode and deliver only diagnosis plus next deterministic fix.

## Workflow

1. Define reader and objective.
- Write one sentence for target reader, one sentence for decision/action expected after reading.

2. Select article profile and content budget before drafting.
- Choose profile: `brainstorm` / `protocol` / `infrastructure` / `general`.
- Write a compact budget card in `review_report.md`: target words, case count, diagram count, full-sample requirement.
- First-draft rule: do not output framework-only short draft as final article.

3. Run version baseline gate before drafting.
- If prior versions exist, read previous `techniques`, gap analysis, and latest review.
- Record a 3-column baseline note in `review_report.md`: keep / add / tighten.
- Record baseline evidence classes in `review_report.md` (`full sample`, `hard evidence chain`, `anti-pattern`, `rollout/checklist`).
- Do not start rewriting before this baseline note is written.

4. Build outline first.
- Keep H2 count between 3 and 5.
- Use H3 as scan anchors (problem, mechanism, signal, action).
- Keep planning contract in `outline.md`; do not copy planning scaffolding into publish article.

5. Draft with argument order.
- Section-level: lead with judgment.
- Paragraph-level: evidence/mechanism first, then local conclusion.
- End each major section with explicit action or validation signal.
- Keep publish narrative continuous; avoid checklist-like process fields in body text.

6. Split publication and execution content.
- Main article explains why the approach is correct.
- Execution appendix defines how to run, verify, and recover.
- If process fields are needed for traceability, write them only in appendix/report.

7. Run program hard gate checks.
- Run `python3 scripts/check-article.py --input <article.md> --strict --profile <profile> --report <review_report.md>`.
- Fix all `errors` before publishing.
- For any rewrite task, `--baseline <previous_article.md>` is required; do not skip baseline comparison.
- Treat high-compression + evidence-class drop as release-blocking regression.
- For high-content baseline rewrites, compression over 45% requires explicit scope-cut note; otherwise block release.

8. Run program warning review and agent gate.
- Review warnings from checker with explicit decisions in `review_report.md`.
- Score with `references/agent-gate-rubric.md` and emit findings (`P1/P2/P3` + file/line + fix direction).
- If any `P1` remains open, status is `revise` and release is blocked.

9. Run optional expert-forum review for high-stakes topics.
- Use `lightning_talk_forum` to converge quickly.
- Use `deep_dive_forum` when one claim is controversial or high-risk.
- Keep references, scoring, and claim/tool validation traceable.

10. Final handoff.
- Publish `article.md`.
- Store `execution_appendix.md` and `review_report.md` for downstream implementation.

## Fallback Path (No Clear Fit)

- If source material is too weak, first request one concrete reader profile and one target decision.
- If the article cannot meet hard gates in one round, publish only `review_report.md` and stop before release.
- If external references conflict, keep both views in `execution_appendix.md` and mark decision owner explicitly.

## Quality Gates

- Hard gates:
  - Exactly one H1.
  - H2 count in configured range (default 3~5).
  - No unresolved placeholders.
  - No internal directive leakage in publish article.
  - Profile density floor passed (`--profile`).
  - No high-compression rewrite regression vs baseline evidence classes.
- Warning gates:
  - Overloaded bullet sections (continuous list items > 5).
  - Generic headings with low semantic specificity.
  - No concrete example markers in body.
  - Evidence pack is thinner than baseline.
  - AI-tone risk phrases requiring human rewrite judgment.
  - Suspicious content shrink relative to baseline draft.

See details in `references/quality-gates.md`.

## Commands

```bash
python3 scripts/check-article.py --input <article.md> --strict --profile <brainstorm|protocol|infrastructure|general> --report <review_report.md>
python3 scripts/check-article.py --input <article.md> --strict --profile <...> --baseline <previous.md> --report <review_report.md>
bash scripts/validate-skill.sh
```

## References

- `references/start-here.md`
- `references/quality-gates.md`
- `references/writing-techniques.md`
- `references/markdown-formatting.md`
- `references/agent-gate-rubric.md`
- `references/tpl/article-template.md`
- `references/tpl/execution-appendix-template.md`
- `references/tpl/review-report-template.md`

## `[[BAGAKIT]]` Footer (Non-Article Only)

- Use only in response metadata or `review_report.md`.
- Never append this footer to `article.md`.

```text
[[BAGAKIT]]
- PaperworkWriting: Stage=<outline|draft|review|publish>; Gate=<pass|fail>; Evidence=<report/refs>; Next=<next deterministic action>
```
