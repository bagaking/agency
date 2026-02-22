# Agent Gate Rubric

Use this rubric for agent-led quality checks that should remain in warning/review
scope instead of strict hard-fail rules.

## 1. Scoring Dimensions (1-10)

Score each dimension independently.

| Dimension | What to check | 10 means | <=5 means |
|---|---|---|---|
| Execution clarity | next action is deterministic and testable | implementer can execute without follow-up questions | action depends on hidden context |
| Trigger precision | scope and entry conditions are explicit | no ambiguous trigger overlap | trigger is broad/vague |
| Standalone integrity | no mandatory hidden external dependency | full local path available | missing required dependency contract |
| Information architecture | heading/section hierarchy supports fast scan | decision path reconstructable from headings | structure requires full linear reading |
| Evidence package density | concrete examples + artifact anchors + operational signals | article has reviewable proof, not just framework outline | mostly framework narrative with weak concrete proof |
| Publish suitability | language is objective, specific, and source-aware | publish-ready with minimal edit | heavy template tone or unsupported claims |
| First-draft readiness | first draft already contains enough depth anchors | no major expansion needed before publish review | draft is still scaffold-level and needs bulk expansion |

## 1.1 Weighted Final Score (Recommended)

When comparing competing drafts, use a stable weighted formula:

`Final = 0.35*专业性 + 0.30*可验证性 + 0.20*社区美誉度 + 0.15*(10 - AI嫌疑风险)`

Mapping guidance:

- 专业性: execution clarity + trigger precision + standalone integrity
- 可验证性: evidence package density + explicit validation/threshold linkage
- 社区美誉度: publish suitability + portability/adoptability
- AI嫌疑风险: slogan density, template smell, unsupported abstraction level

## 2. Severity Model

- `P1`: release-critical risk; must revise before completion
- `P2`: high-impact issue; can proceed only with explicit mitigation
- `P3`: quality improvement; track in next iteration

## 3. Decision Policy

- `approve`:
  - no `P1`
  - all key dimensions >= 7
- `revise`:
  - any `P1`
  - or two or more key dimensions < 7

Key dimensions:

- execution clarity
- trigger precision
- standalone integrity

## 4. Finding Output Contract

Every finding must include:

- severity (`P1/P2/P3`)
- file path and line anchor
- impact statement
- concrete fix direction

Recommended finding format:

```text
[P2] <short title>
file: <path>:<line>
impact: <what breaks and why>
fix: <smallest effective correction>
```

## 5. Review Procedure

1. Score all six dimensions.
2. For medium/high complexity topics, explicitly score evidence-pack retention vs baseline.
3. Emit findings ordered by severity.
4. Decide `approve` or `revise` using policy.
5. Record open risks and owner.
6. If revised, define next deterministic action.

## 6. Anti-Pattern Alerts

Flag these as at least `P2` unless justified:

- claims with no evidence path
- framework-like structure with low evidence density
- heading hierarchy that hides decision flow
- ambiguous ownership in execution instructions
- summary language that replaces operational detail
