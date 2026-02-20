# Quality Gates

Quality gates are split into hard gates and warning gates.

- hard gates define non-negotiable release conditions
- warning gates require human judgment and explicit record

## 1. Hard Gates (block publish)

Hard gate failure means the draft cannot be marked complete.

| Gate | Rule | Why this matters |
|---|---|---|
| H1 uniqueness | exactly one H1 | prevents structural ambiguity |
| H2 range | H2 count in `[3, 5]` by default | keeps scanability and scope control |
| placeholder hygiene | no `TODO`, `TBD`, `{{...}}`, `待补充` | avoids implicit unfinished state |
| checker status | `scripts/check-article.py --strict` exits `0` | ensures objective baseline is met |

## 2. Warning Gates (human review required)

Warning gates do not auto-block release, but cannot be silently ignored.

| Gate | Trigger | Required reviewer action |
|---|---|---|
| list overload | any continuous bullet block > 5 items | justify list form or convert part to narrative |
| generic headings | headings like `问题诊断`, `问题陈述`, `方案设计`, `总结` | rewrite to reader-question or scoped heading |
| example absence | no explicit markers (`例如`, `比如`, `case`, `before`, `after`) | add at least one concrete example or rationale |
| AI-tone phrase risk | phrases such as `打稳`, `抓手`, `返工机器`, `接得住` | rewrite into owner/action/signal language |

## 3. Review Recording Contract

For every warning gate that remains:

- write decision in `review_report.md`
- include reason and reviewer name/role
- include whether follow-up is required

If warning count increases compared with prior version, explain why.

## 4. Release Decision Policy

- `pass`: all hard gates pass, warnings are reviewed and documented
- `fail`: any hard gate fails
- `conditional pass`: hard gates pass, warning follow-up is accepted with explicit owner

## 5. Escalation Rules

Escalate to deep review when any of the following occurs:

- same hard gate fails in 2 consecutive iterations
- warning count rises for 2 consecutive iterations
- gate conflicts with business-critical publication deadline

Escalation output should define:

- what is blocked
- what can still ship
- who owns recovery and by when

## 6. Operational Command

```bash
python3 scripts/check-article.py --input article.md --strict --report review_report.md
```

## 7. Minimal Reviewer Checklist

- [ ] Hard-gate status is explicit.
- [ ] Warning decisions are recorded with rationale.
- [ ] No unresolved placeholders remain.
- [ ] Release status (`pass/fail/conditional pass`) is written in report.
