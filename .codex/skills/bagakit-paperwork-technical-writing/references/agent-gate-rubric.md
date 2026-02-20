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
| Publish suitability | language is objective, specific, and source-aware | publish-ready with minimal edit | heavy template tone or unsupported claims |

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

1. Score all five dimensions.
2. Emit findings ordered by severity.
3. Decide `approve` or `revise` using policy.
4. Record open risks and owner.
5. If revised, define next deterministic action.

## 6. Anti-Pattern Alerts

Flag these as at least `P2` unless justified:

- claims with no evidence path
- heading hierarchy that hides decision flow
- ambiguous ownership in execution instructions
- summary language that replaces operational detail
