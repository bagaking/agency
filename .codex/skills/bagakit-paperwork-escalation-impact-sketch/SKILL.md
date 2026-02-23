---
name: bagakit-paperwork-escalation-impact-sketch
description: Use when you need to write a 15-second organizational escalation comedy sketch that starts from a low-threshold mistake and lands on a cold-fact punchline.
---

# Bagakit Paperwork Escalation Impact Sketch

Deliver short, high-impact escalation sketches that are immediately understandable and highly shareable.

## Purpose

- Turn a small operational mistake into a fast, escalating organizational comedy beat within 15 seconds.
- Keep writing quality explicit through objective checks and repeatable review steps.
- Keep output split clear: publish-ready sketch vs execution handoff notes.
- Keep workflow standalone-first: drafting and checks run locally with no mandatory external system.
- Keep comedy on people and situations, not on jargon overload.

## When to Use This Skill

- You need to create or rewrite a short “组织荒诞快切剧” style script.
- You need a deterministic 5-step escalation structure instead of ad-hoc jokes.
- You need quality gates to ensure each line escalates and ending is a cold-fact kill shot.

## When NOT to Use This Skill

- You are writing long-form analysis, technical tutorial, or RFC-style explanation.
- You only need grammar polishing without structural rewriting.
- You need pure technical debugging dialogue where humor/escalation is not the goal.

## Input Contract

- Required:
  - one incident seed (a low-threshold mistake).
  - one target scene (meeting/group chat/screen-share/interview/review).
- Strongly recommended:
  - cast roles (压场角色、冲突角色、理性角色、门口冷刀角色).
  - taboo list (what cannot be mocked).
- Optional:
  - brand/persona constraints.
  - preferred title/subtitle.

## Output Routes and Default Mode

- Deliverable archetype/type: short-form organizational escalation sketch (`incident seed -> 15s script + execution notes`).
- Action-handoff output: `sketch.md` with final lines ready for voice/video performance.
- Memory-handoff output: `review_report.md` with gate evidence, weaknesses, and next iteration signal.
- Supporting execution output: `execution_appendix.md` with beat timing, role allocation, and take notes.
- Default route behavior (no adapter): write outputs locally in current working directory.
- Adapter policy: standalone-only by default; optional adapter routes can map action/memory handoff to task-driver or memory-system by capability/contract signals.

## Non-Negotiable Boundary

- `sketch.md` is performance-facing content only.
- Process metadata and internal status fields must not leak into `sketch.md`.
- Validation evidence, reviewer comments, and iteration tasks belong to `review_report.md`.

## Structure (5 Steps)

1. Hook (`钩子`)
- Open with a one-line “already broken” question.
- Must be understandable to non-experts in one second.
- Must imply visible loss/embarrassment.

2. Blame Ping-Pong (`互怼甩锅`)
- Two roles exchange responsibility fast.
- Use “我问你…你说…” pattern as the primary engine.
- Every line must add new damage, not background exposition.

3. Escalation (`升级`)
- Expand from execution mistake to organizational social-risk scene.
- Preferred escalation order:
  1. boss/client/candidate/request-owner present.
  2. group chat/screen share/meeting/public scene exposure.
  3. high-pressure context (incident review/report/interview).
  4. technical detail only as garnish.

4. Anchor Question (`追问锚点`)
- Use an order role (usually 压场角色) to ask what audience most wants to know.
- Purpose: collapse rhythm and focus attention on reveal.

5. Cold Knife (`冷刀收尾`)
- End with fact, not explanation.
- Formula: `门口角色 + 平静语气 + 新事实 + 更糟后果`.
- The final line must be worse than all previous lines.

## Writing Rules (Hard Rules)

1. Joke targets people/situations, not jargon.
- Prioritize: 尴尬、社死、嘴硬、甩锅、装懂、补刀.
- De-prioritize: dense jargon blocks (`403`, `staging`, `token`, `namespace`) except one-line garnish.

2. Every line must make it worse.
- Self-check: if removing a line does not hurt escalation, that line is filler.

3. Ending gives fact only.
- Never end with moral sentence (for example “所以要规范流程”).
- End with one new fact that closes the scene.

4. Keep role functions stable for serial consistency.
- 压场角色: ask anchor question and hold rhythm.
- 冲突角色: generate conflict and blame flips.
- 理性角色: expose logic contradiction.
- 门口角色: deliver cold knife.

## Viral Self-Check (4 Items)

- Can outsiders understand it in 1 second?
- Is the last line worse than everything before it?
- Is there at least one screenshot-friendly visual line?
- If role names are removed, is the sketch still funny?

## Workflow

1. Lock one incident seed and one scene (15-second target).
2. Assign cast by function (压场/冲突/理性/门口冷刀).
3. Draft the 5-step skeleton before polishing language.
4. Fill lines with escalation-first rhythm (`我问你...你说...`).
5. Run hard gate checker:
- `python3 scripts/check-sketch.py --input sketch.md --strict --report review_report.md`
6. Review warnings in `review_report.md`, then tighten punchline.
7. Finalize `sketch.md`, `execution_appendix.md`, `review_report.md`.

## Cross-Skill Contract

- Cross-skill interaction is optional and signal-driven.
- If another workflow is present, exchange only contract/schema signals; do not hard-call external skill flows.

## Archive Gate (Completion Handoff)

- Completion can be marked `complete` only when all required outputs exist with explicit destination path/id.
- Action handoff destination must be explicit: `action_handoff -> sketch.md`.
- Memory handoff destination must be explicit: `memory_handoff -> review_report.md`.
- Archive destination must be explicit: `archive -> execution_appendix.md` and review decision recorded.
- If hard gate fails, status must remain `revise` and publish is blocked.

## Fallback Path (No Clear Fit)

- If source incident is vague, ask for one concrete incident seed and one concrete scene first.
- If no stable escalation path appears, publish only `review_report.md` with missing inputs and next deterministic action.
- If constraints conflict (for example legal/compliance), keep humor neutral and downgrade to non-satirical incident narrative.

## Quality Gates

- Hard gates:
  - 5-step structure present (Hook, Ping-Pong, Escalation, Anchor Question, Cold Knife).
  - Dialogue line count in configured range (default 8-18).
  - At least one “我问你…你说…” chain.
  - At least two explicit questions (opening + anchor question).
  - No unresolved placeholders.
  - No moralizing ending in final line.
  - Final line contains new fact and worsened consequence signal.
- Warning gates:
  - Jargon density too high.
  - Visual scene anchors too weak.
  - Role function drift.
  - Escalation relies on explanation instead of reveal.

See `reference/quality-gates.md` for full policy.

## Complexity Guardrails (Anti-Bloat Checks)

- `preset-heavy` / `预设偏多`:
  - keep one default drafting route; move scenario-specific variants to optional notes.
  - check: list every default once and justify each default briefly.
- `implementation-heavy` / `实现偏重`:
  - do not solve comedic quality primarily through scripts.
  - check: keep qualitative judgment in reviewer rubric before adding code gates.
- `too-many-defaults` / `默认行为太多`:
  - avoid hidden defaults outside workflow + output route section.
  - check: if a new default is added, document trigger and tradeoff.
- `over-hard-validation` / `校验过硬`:
  - avoid over-hard validation and strict gate expansion on subjective humor dimensions.
  - script gates should enforce objective invariants only.
  - check: humor quality and taste decisions stay review/audit based.
- `scattered-constraints` / `约束分散`:
  - keep single-source constraints in `reference/quality-gates.md`.
  - check: avoid duplicating must-rules across many files without source anchor.

## Commands

```bash
python3 scripts/check-sketch.py --input sketch.md --strict --report review_report.md
bash scripts/validate-skill.sh
```

## References

- `reference/start-here.md`
- `reference/quality-gates.md`
- `reference/writing-techniques.md`
- `reference/tpl/sketch-template.md`
- `reference/tpl/execution-appendix-template.md`
- `reference/tpl/review-report-template.md`

## `[[BAGAKIT]]` Footer (Non-Sketch Only)

```text
[[BAGAKIT]]
- PaperworkSketch: Stage=<outline|draft|review|publish>; Gate=<pass|fail>; Evidence=<report/refs>; Next=<next deterministic action>
```
